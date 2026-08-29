import { ConnectGoogleButton } from '@/components/google/connect-button';
import { DisconnectGoogleButton } from '@/components/google/disconnect-button';
import { PageHeader } from '@/components/ui/page-header';
import { getIntegrationStatus, getValidAccessToken } from '@/lib/google/tokens';
import { listUpcomingEvents } from '@/lib/google/calendar';
import { createClient } from '@/lib/supabase/server';

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const status = await getIntegrationStatus(user.id, 'calendar');
  const events = status.connected ? await safeListEvents(user.id) : null;

  const upcomingPlans = await getUpcomingPlanOccurrences(supabase, user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <PageHeader
        title="Calendar"
        subtitle="What's happening and when."
        action={
          status.connected ? (
            <DisconnectGoogleButton service="calendar" />
          ) : (
            <ConnectGoogleButton service="calendar" next="/calendar" />
          )
        }
      />

      {!status.connected && (
        <div className="mt-8 rounded-md border border-dashed border-border py-10 text-center">
          <p className="text-sm text-ink-muted">Connect Google Calendar to see your school schedule here.</p>
          <p className="mt-1 text-xs text-ink-faint">Relay only requests read access to your events.</p>
        </div>
      )}

      {status.connected && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-medium text-ink-muted">From Google Calendar</h2>
          {events === null ? (
            <p className="text-sm text-red-500">Couldn&apos;t load your calendar right now.</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-ink-faint">Nothing coming up.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {events.map((event) => (
                <li key={event.id} className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-sm text-ink">{event.summary}</span>
                  <span className="text-xs text-ink-faint">{formatEventTime(event.start, event.isAllDay)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-ink-muted">Relay Plans</h2>
        {upcomingPlans.length === 0 ? (
          <p className="text-sm text-ink-faint">No upcoming plans.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {upcomingPlans.map((p) => (
              <li key={p.instanceId} className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <span className="text-sm text-ink">{p.planName}</span>
                  <span className="ml-2 text-xs text-ink-faint">{p.groupName}</span>
                </div>
                <span className="text-xs text-ink-faint">{formatDate(p.occursOn)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function safeListEvents(userId: string) {
  try {
    const token = await getValidAccessToken(userId, 'calendar');
    if (!token) return null;
    return await listUpcomingEvents(token, 10);
  } catch {
    return null;
  }
}

async function getUpcomingPlanOccurrences(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', userId);
  const groupIds = (memberships ?? []).map((m) => m.group_id);
  if (groupIds.length === 0) return [];

  const today = new Date().toISOString().slice(0, 10);
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, group:groups(name), instances:plan_instances(id, occurs_on)')
    .in('group_id', groupIds);

  return (plans ?? [])
    .flatMap((plan: any) =>
      plan.instances
        .filter((i: any) => i.occurs_on >= today)
        .map((i: any) => ({
          instanceId: i.id as string,
          occursOn: i.occurs_on as string,
          planName: plan.name as string,
          groupName: plan.group?.name as string,
        }))
    )
    .sort((a, b) => a.occursOn.localeCompare(b.occursOn))
    .slice(0, 10);
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatEventTime(start: string, isAllDay: boolean): string {
  const date = new Date(start);
  if (isAllDay) return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return date.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}
