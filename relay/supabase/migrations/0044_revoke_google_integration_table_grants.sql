-- Revoke direct browser-role access to Google OAuth token storage.
-- Relay accesses this table only through server-only/service-role code.
-- RLS already denies direct row access; these revokes enforce least privilege
-- at the SQL privilege layer as well.

revoke all on table public.google_integrations from anon, authenticated;
