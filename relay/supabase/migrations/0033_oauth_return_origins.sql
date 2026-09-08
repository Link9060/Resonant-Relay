-- Preserve the initiating trusted Relay origin across OAuth redirects so the
-- same Edge Functions can serve production, beta, and local development.
alter table public.email_oauth_states
  add column if not exists return_origin text not null default 'https://resonantrelay.org';

alter table public.google_oauth_states
  add column if not exists return_origin text not null default 'https://resonantrelay.org';

alter table public.email_oauth_states
  drop constraint if exists email_oauth_states_return_origin_check;
alter table public.email_oauth_states
  add constraint email_oauth_states_return_origin_check
  check (return_origin in ('https://resonantrelay.org', 'https://link9060.github.io', 'http://localhost:3000'));

alter table public.google_oauth_states
  drop constraint if exists google_oauth_states_return_origin_check;
alter table public.google_oauth_states
  add constraint google_oauth_states_return_origin_check
  check (return_origin in ('https://resonantrelay.org', 'https://link9060.github.io', 'http://localhost:3000'));
