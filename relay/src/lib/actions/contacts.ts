import { createClient } from '@/lib/supabase/client';
import { normalizeRelayNumber } from '@/lib/utils';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function lookupRelayNumber(rawInput: string): Promise<ActionResult<{ id: string; display_name: string; avatar_url: string | null; school: string | null }>> {
  const relayNumber = normalizeRelayNumber(rawInput);
  if (relayNumber.length !== 7) return { ok: false, error: 'Relay Numbers are 7 digits — check for a typo.' };
  const { data, error } = await createClient().rpc('find_by_relay_number', { p_relay_number: relayNumber });
  if (error) return { ok: false, error: error.message.includes('too many') ? error.message : "Couldn't look that up right now." };
  if (!data?.length) return { ok: false, error: 'No one has that Relay Number.' };
  return { ok: true, data: data[0]! };
}

export async function sendConnectionRequest(recipientId: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { error } = await supabase.from('connection_requests').insert({ sender_id: user.id, recipient_id: recipientId });
  if (error) return { ok: false, error: error.code === '23505' ? 'You already have a pending request with this person.' : error.message };
  return { ok: true, data: undefined };
}

export async function acceptConnectionRequest(requestId: string): Promise<ActionResult> {
  const { error } = await createClient().rpc('accept_connection_request', { p_request_id: requestId });
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined };
}

export async function declineConnectionRequest(requestId: string): Promise<ActionResult> { return updateRequest(requestId, 'declined'); }
export async function cancelConnectionRequest(requestId: string): Promise<ActionResult> { return updateRequest(requestId, 'canceled'); }

async function updateRequest(requestId: string, status: 'declined' | 'canceled'): Promise<ActionResult> {
  const { error } = await createClient().from('connection_requests').update({ status, responded_at: new Date().toISOString() }).eq('id', requestId);
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined };
}
