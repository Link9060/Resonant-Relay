-- Prevent Relay from creating any new Gmail / inbox grants.
--
-- Existing broad OAuth grants are intentionally not deleted here because those
-- rows may also be the user's Calendar connection. Runtime code quarantines
-- them and asks the user to reconnect, which replaces the grant with a
-- Calendar-only token without silently deleting their connection data.

alter table public.google_integrations
  drop constraint if exists google_integrations_service_check;

alter table public.google_integrations
  add constraint google_integrations_service_check
  check (service = 'calendar') not valid;

alter table public.google_oauth_states
  drop constraint if exists google_oauth_states_service_check;

alter table public.google_oauth_states
  add constraint google_oauth_states_service_check
  check (service = 'calendar');

alter table public.google_oauth_states
  drop constraint if exists google_oauth_states_return_to_check;

alter table public.google_oauth_states
  add constraint google_oauth_states_return_to_check
  check (return_to = '/calendar');

alter table public.email_integrations
  drop constraint if exists email_integrations_no_mail_scope_check;

alter table public.email_integrations
  add constraint email_integrations_no_mail_scope_check
  check (
    granted_scope is null
    or (
      lower(granted_scope) not like '%gmail%'
      and lower(granted_scope) not like '%mail.read%'
    )
  ) not valid;
