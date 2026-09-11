-- Keep email/calendar OAuth returns on the Relay surface that initiated them.
-- Only known Relay origins are accepted so OAuth state cannot become an open redirect.
alter table public.email_oauth_states
  add column if not exists return_origin text not null default 'https://link9060.github.io';

alter table public.email_oauth_states
  drop constraint if exists email_oauth_states_return_origin_check;

alter table public.email_oauth_states
  add constraint email_oauth_states_return_origin_check
  check (return_origin in (
    'https://link9060.github.io',
    'https://resonantrelay.org',
    'https://www.resonantrelay.org',
    'http://localhost:3000'
  ));
