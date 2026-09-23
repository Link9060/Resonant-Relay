-- RESONANT FIELD — REMOVE DEFAULT PUBLIC EXECUTE FROM TRIGGER FUNCTIONS
revoke all on function public.field_sync_relay_note() from public;
revoke all on function public.field_sync_relay_todo() from public;
revoke all on function public.field_sync_relay_calendar_event() from public;
revoke all on function public.field_ensure_source_preference(uuid, text, text, boolean) from public;
revoke all on function public.field_set_updated_at() from public;
