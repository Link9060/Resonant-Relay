-- Purge legacy OAuth grants that included inbox/mail permissions.
--
-- These rows were created before Relay removed the Email feature. They may
-- also have carried Calendar access, so users affected by this cleanup will
-- reconnect Calendar once and receive a new calendar-only grant.

delete from public.google_oauth_states
where service = 'gmail' or return_to = '/email';

delete from public.google_integrations
where service = 'gmail';

delete from public.email_integrations
where lower(coalesce(granted_scope, '')) like '%gmail%'
   or lower(coalesce(granted_scope, '')) like '%mail.read%';

alter table public.google_integrations
  validate constraint google_integrations_service_check;

alter table public.email_integrations
  validate constraint email_integrations_no_mail_scope_check;
