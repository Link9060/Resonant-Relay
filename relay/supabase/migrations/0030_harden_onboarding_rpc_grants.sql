-- Supabase can retain explicit anon EXECUTE grants even after revoking PUBLIC.
-- Keep the onboarding/username RPC surface authenticated-only at the privilege layer.

revoke all on function public.username_available(text) from anon;
revoke all on function public.save_onboarding_profile(text,text,text,text,integer,text,boolean,boolean) from anon;
revoke all on function public.finish_onboarding(boolean) from anon;
revoke all on function public.change_username(text) from anon;

grant execute on function public.username_available(text) to authenticated;
grant execute on function public.save_onboarding_profile(text,text,text,text,integer,text,boolean,boolean) to authenticated;
grant execute on function public.finish_onboarding(boolean) to authenticated;
grant execute on function public.change_username(text) to authenticated;
