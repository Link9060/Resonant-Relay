'use server';

import { createClient } from '@/lib/supabase/server';
import { normalizeRelayNumber } from '@/lib/utils';
import { notify } from '@/lib/notifications/notify';
import { revalidatePath } from 'next/cache';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Looks up a person by Relay Number so the sender can confirm who they're
 * adding before a request goes out. Goes through the rate-limited
 * find_by_relay_number RPC — never a direct table query — so this can't be
 * used to scrape the user base (see supabase/schema.sql for the limits).
 */
export async function lookupRelayNumber(rawInput: string): Promise<ActionResult<{
  id: string;
  display_name: string;
  avatar_url: string | null;
  school: string | null;
}>> {
  const relayNumber = normalizeRelayNumber(rawInput);
  if (relayNumber.length !== 7) {
    return { ok: false, error: 'Relay Numbers are 7 digits — check for a typo.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('find_by_relay_number', { p_relay_number: relayNumber });

  if (error) {
    return { ok: false, error: error.message.includes('too many') ? error.message : "Couldn't look that up right now." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "No one has that Relay Number." };
  }

  return { ok: true, data: data[0]! };
}

export async function sendConnectionRequest(recipientId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { error } = await supabase
    .from('connection_requests')
    .insert({ sender_id: user.id, recipient_id: recipientId });

  if (error) {
    const message = error.code === '23505' ? 'You already have a pending request with this person.' : error.message;
    return { ok: false, error: message };
  }

  const { data: senderProfile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
  await notify({
    userId: recipientId,
    type: 'connection_request',
    title: 'New connection request',
    body: `${senderProfile?.display_name ?? 'Someone'} wants to connect.`,
    link: '/contacts',
  }).catch(() => {
    // Notification delivery failing shouldn't undo an already-sent request.
  });

  revalidatePath('/contacts');
  return { ok: true, data: undefined };
}

export async function acceptConnectionRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data: request } = await supabase
    .from('connection_requests')
    .select('sender_id')
    .eq('id', requestId)
    .single();

  const { error } = await supabase.rpc('accept_connection_request', { p_request_id: requestId });
  if (error) return { ok: false, error: error.message };

  if (request) {
    const { data: accepterProfile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
    await notify({
      userId: request.sender_id,
      type: 'connection_accepted',
      title: 'Connection accepted',
      body: `${accepterProfile?.display_name ?? 'Someone'} accepted your request.`,
      link: '/contacts',
    }).catch(() => {});
  }

  revalidatePath('/contacts');
  return { ok: true, data: undefined };
}

export async function declineConnectionRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('connection_requests')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/contacts');
  return { ok: true, data: undefined };
}

export async function cancelConnectionRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('connection_requests')
    .update({ status: 'canceled', responded_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/contacts');
  return { ok: true, data: undefined };
}
