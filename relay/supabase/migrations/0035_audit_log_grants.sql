-- Audit rows are written only by trusted SECURITY DEFINER moderation/owner RPCs.
-- Remove broad client table privileges and keep only authenticated SELECT,
-- with RLS restricting visibility to the Relay Owner.

revoke all on table public.admin_audit_log from anon, authenticated;
grant select on table public.admin_audit_log to authenticated;

drop policy if exists audit_no_client_write on public.admin_audit_log;
drop policy if exists audit_owner_read on public.admin_audit_log;
create policy audit_owner_read
on public.admin_audit_log for select
to authenticated
using (public.has_staff_role('owner'));
