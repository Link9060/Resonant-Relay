-- Beta-first ARROW Adapt dashboard layout, additive to Relay's existing UI preferences.
-- The table's existing user_id primary key and owner-only RLS policies remain authoritative.
alter table public.user_ui_preferences
  add column if not exists orbit_dashboard_layout jsonb;

alter table public.user_ui_preferences
  drop constraint if exists user_ui_preferences_orbit_dashboard_layout_array;

alter table public.user_ui_preferences
  add constraint user_ui_preferences_orbit_dashboard_layout_array
  check (
    orbit_dashboard_layout is null
    or (
      jsonb_typeof(orbit_dashboard_layout) = 'array'
      and jsonb_array_length(orbit_dashboard_layout) <= 24
    )
  );

comment on column public.user_ui_preferences.orbit_dashboard_layout
  is 'Per-account active Orbit widget layout; Relay dashboard presets remain unchanged.';
