-- Store Relay's visual identity choices per authenticated account.
-- Null means the account has never saved visual preferences and should receive
-- Relay's safe defaults (Classic + Flow + Monochrome).
alter table public.user_ui_preferences
  add column if not exists visual_preferences jsonb;

alter table public.user_ui_preferences
  drop constraint if exists user_ui_preferences_visual_preferences_object;

alter table public.user_ui_preferences
  add constraint user_ui_preferences_visual_preferences_object
  check (visual_preferences is null or jsonb_typeof(visual_preferences) = 'object');
