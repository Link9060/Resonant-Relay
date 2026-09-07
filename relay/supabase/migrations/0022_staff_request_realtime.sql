-- RELAY — REALTIME STAFF REQUEST NOTIFICATIONS
-- Staff can subscribe only to request categories permitted by their actual role.

create policy "staff_requests_staff_read"
  on public.staff_requests for select
  using (
    public.has_staff_role('moderator')
    and public.staff_can_view_request_type(public.current_app_role(), request_type)
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'staff_requests'
     ) then
    execute 'alter publication supabase_realtime add table public.staff_requests';
  end if;
end;
$$;
