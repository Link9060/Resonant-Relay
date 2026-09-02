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
  const { error } = await supabase.rpc('send_connection_request', { p_recipient_id: recipientId });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes('too many')) return { ok: false, error: 'You have sent a few requests recently. Try again in a few minutes.' };
    if (message.includes('pending') || message.includes('already connected')) return { ok: false, error: 'You already have an active connection request with this person.' };
    return { ok: false, error: 'This person is unavailable right now.' };
  }
  return { ok: true, data: undefined };
}

export async function acceptConnectionRequest(requestId: string): Promise<ActionResult> {
  const { error } = await createClient().rpc('accept_connection_request', { p_request_id: requestId });
  return error ? { ok: false, error: 'That request is no longer available.' } : { ok: true, data: undefined };
}

export async function declineConnectionRequest(requestId: string): Promise<ActionResult> {
  const { error } = await createClient().rpc('decline_connection_request', { p_request_id: requestId });
  return error ? { ok: false, error: 'That request is no longer available.' } : { ok: true, data: undefined };
}

export async function cancelConnectionRequest(requestId: string): Promise<ActionResult> {
  const { error } = await createClient().rpc('cancel_connection_request', { p_request_id: requestId });
  return error ? { ok: false, error: 'That request is no longer available.' } : { ok: true, data: undefined };
}
