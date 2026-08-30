-- Run Relay's planner reminder generator every morning from Supabase itself.
-- pg_cron schedules in UTC; 13:00 UTC is 8:00 AM during Chicago daylight time.

create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'relay-plan-reminders'
  ) then
    perform cron.unschedule('relay-plan-reminders');
  end if;

  perform cron.schedule(
    'relay-plan-reminders',
    '0 13 * * *',
    'select public.create_plan_reminders();'
  );
end;
$$;
