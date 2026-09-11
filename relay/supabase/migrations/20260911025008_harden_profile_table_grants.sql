-- Profiles are created by the auth.users trigger and privileged mutations use guarded RPCs.
-- Anonymous clients should have no direct table access. Signed-in clients retain
-- SELECT plus the existing explicit column-level UPDATE grants only.
revoke all on table public.profiles from anon;
revoke insert, delete, truncate, references, trigger on table public.profiles from authenticated;
