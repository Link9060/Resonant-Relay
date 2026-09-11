revoke execute on function public.decline_connection_request(uuid) from public, anon;
revoke execute on function public.cancel_connection_request(uuid) from public, anon;
grant execute on function public.decline_connection_request(uuid) to authenticated;
grant execute on function public.cancel_connection_request(uuid) to authenticated;
