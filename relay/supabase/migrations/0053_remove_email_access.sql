-- Remove Relay's inbox/email integration and narrow Google OAuth to Calendar only.
--
-- Existing multi-account OAuth tokens may have been granted Gmail/Mail scopes.
-- Purge them so connected calendars must be re-authorized with the new
-- calendar-only scope set.

delete from public.google_oauth_states
where service = 'gmail' or return_to = '/email';

delete from public.google_integrations
where service = 'gmail';

delete from public.email_oauth_states;
delete from public.email_integrations;

alter table public.google_integrations
  drop constraint if exists google_integrations_service_check;

alter table public.google_integrations
  add constraint google_integrations_service_check
  check (service = 'calendar');

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
