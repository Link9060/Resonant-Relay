-- Supabase projects may have default function privileges that grant EXECUTE to
-- anon at creation time. Keep these RPCs authenticated-only at the privilege
-- layer in addition to their internal auth.uid / role checks.
revoke execute on function public.save_profile_settings(text,text,text,text,text,integer,text) from anon;
revoke execute on function public.beta_access_status() from anon;
revoke execute on function public.request_beta_access(text) from anon;
revoke execute on function public.admin_list_beta_testers(integer,integer) from anon;
revoke execute on function public.owner_list_beta_requests(text,integer,integer) from anon;
revoke execute on function public.owner_review_beta_request(uuid,boolean,text) from anon;
revoke execute on function public.owner_revoke_beta_access(uuid,text) from anon;
