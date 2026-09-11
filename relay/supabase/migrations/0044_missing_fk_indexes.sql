-- Low-risk indexes surfaced by the Supabase performance advisor.
-- These speed joins/deletes around Beta review and support-email ownership.
create index if not exists beta_access_requests_reviewed_by_idx
  on public.beta_access_requests(reviewed_by);

create index if not exists beta_testers_approved_by_idx
  on public.beta_testers(approved_by);

create index if not exists beta_testers_revoked_by_idx
  on public.beta_testers(revoked_by);

create index if not exists support_email_messages_sent_by_idx
  on public.support_email_messages(sent_by);

create index if not exists support_email_threads_assigned_to_idx
  on public.support_email_threads(assigned_to);
