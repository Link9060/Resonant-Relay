-- first_name allows 40 chars and last_name allows 60. The combined display_name
-- must be able to represent both plus the separating space.
alter table public.profiles drop constraint if exists profiles_display_name_length;
alter table public.profiles
  add constraint profiles_display_name_length
  check (char_length(trim(display_name)) between 1 and 101);
