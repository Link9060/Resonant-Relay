-- Relay has no anonymous public-table data surface. Authentication endpoints use
-- Supabase Auth directly; all application data requires a signed-in session or
-- a guarded SECURITY DEFINER RPC. Remove default anon grants across public.
revoke all privileges on all tables in schema public from anon;
