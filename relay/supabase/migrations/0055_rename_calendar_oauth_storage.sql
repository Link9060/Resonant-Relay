-- Finish the Email feature removal by renaming the remaining OAuth storage
-- to match its only purpose: connected read-only calendars.

alter table public.email_integrations
  rename to calendar_integrations;

alter table public.email_oauth_states
  rename to calendar_oauth_states;

alter table public.calendar_integrations
  rename constraint email_integrations_pkey to calendar_integrations_pkey;
alter table public.calendar_integrations
  rename constraint email_integrations_provider_check to calendar_integrations_provider_check;
alter table public.calendar_integrations
  rename constraint email_integrations_user_id_fkey to calendar_integrations_user_id_fkey;
alter table public.calendar_integrations
  rename constraint email_integrations_user_id_provider_provider_account_id_key
  to calendar_integrations_user_id_provider_provider_account_id_key;
alter table public.calendar_integrations
  rename constraint email_integrations_no_mail_scope_check
  to calendar_integrations_no_mail_scope_check;

alter table public.calendar_oauth_states
  rename constraint email_oauth_states_pkey to calendar_oauth_states_pkey;
alter table public.calendar_oauth_states
  rename constraint email_oauth_states_provider_check to calendar_oauth_states_provider_check;
alter table public.calendar_oauth_states
  rename constraint email_oauth_states_return_origin_check to calendar_oauth_states_return_origin_check;
alter table public.calendar_oauth_states
  rename constraint email_oauth_states_user_id_fkey to calendar_oauth_states_user_id_fkey;

alter index if exists public.email_integrations_user_idx
  rename to calendar_integrations_user_idx;
alter index if exists public.email_oauth_states_user_id_idx
  rename to calendar_oauth_states_user_id_idx;
