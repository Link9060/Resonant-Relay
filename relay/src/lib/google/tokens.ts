import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/service';
import type { GoogleService } from '@/lib/google/scopes';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

/** Called from the OAuth callback right after a "Connect" flow completes. */
export async function saveGoogleIntegration(params: {
  userId: string;
  service: GoogleService;
  refreshToken: string;
  accessToken: string;
  expiresInSeconds: number;
  grantedScope: string;
}) {
  const supabase = createServiceRoleClient();
  const expiresAt = new Date(Date.now() + params.expiresInSeconds * 1000).toISOString();

  const { error } = await supabase.from('google_integrations').upsert(
    {
      user_id: params.userId,
      service: params.service,
      refresh_token: params.refreshToken,
      access_token: params.accessToken,
      access_token_expires_at: expiresAt,
      granted_scope: params.grantedScope,
    },
    { onConflict: 'user_id,service' }
  );

  if (error) throw new Error(`Failed to save Google integration: ${error.message}`);
}

export async function getIntegrationStatus(userId: string, service: GoogleService) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('google_integrations')
    .select('connected_at, granted_scope')
    .eq('user_id', userId)
    .eq('service', service)
    .maybeSingle();

  return data ? { connected: true as const, connectedAt: data.connected_at } : { connected: false as const };
}

/**
 * Returns a valid access token for the given user + service, refreshing it
 * against Google's token endpoint first if it's expired or about to expire.
 * Returns null if the user hasn't connected that service.
 */
export async function getValidAccessToken(userId: string, service: GoogleService): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data: integration } = await supabase
    .from('google_integrations')
    .select('refresh_token, access_token, access_token_expires_at')
    .eq('user_id', userId)
    .eq('service', service)
    .maybeSingle();

  if (!integration) return null;

  const expiresAt = integration.access_token_expires_at ? new Date(integration.access_token_expires_at) : null;
  const stillValid = integration.access_token && expiresAt && expiresAt.getTime() - Date.now() > 60_000;
  if (stillValid) return integration.access_token!;

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    // Refresh token is likely revoked or expired (Google: unused for 6
    // months, password changed with Gmail scopes, etc.) — drop the
    // integration so the UI offers to reconnect instead of failing silently.
    await supabase.from('google_integrations').delete().eq('user_id', userId).eq('service', service);
    return null;
  }

  const tokenData = (await response.json()) as { access_token: string; expires_in: number };

  await supabase
    .from('google_integrations')
    .update({
      access_token: tokenData.access_token,
      access_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    })
    .eq('user_id', userId)
    .eq('service', service);

  return tokenData.access_token;
}

export async function disconnectGoogleIntegration(userId: string, service: GoogleService) {
  const supabase = createServiceRoleClient();
  const { data: integration } = await supabase
    .from('google_integrations')
    .select('refresh_token')
    .eq('user_id', userId)
    .eq('service', service)
    .maybeSingle();

  if (integration) {
    // Best-effort revoke with Google so the grant disappears from the
    // student's Google Account permissions page too, not just from Relay.
    await fetch(`${GOOGLE_REVOKE_ENDPOINT}?token=${encodeURIComponent(integration.refresh_token)}`, {
      method: 'POST',
    }).catch(() => {
      // Non-fatal — we still remove our copy below even if Google's revoke
      // endpoint is unreachable.
    });
  }

  await supabase.from('google_integrations').delete().eq('user_id', userId).eq('service', service);
}
