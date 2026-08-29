import { createServiceRoleClient } from '@/lib/supabase/service';
import { notifyMany } from '@/lib/notifications/notify';
import { NextResponse } from 'next/server';

/**
 * Meant to be hit once a day by a scheduler (see vercel.json) — this route
 * does nothing on its own. Protected by CRON_SECRET so it can't be
 * triggered by anyone who finds the URL.
 *
 * This is the one notification type in Relay that's time-based rather than
 * event-triggered ("Seminar is tomorrow" vs. "someone just messaged you"),
 * which is why it needs a scheduler at all — everything else fires directly
 * from the server action that caused it.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: instances } = await supabase
    .from('plan_instances')
    .select('id, plan:plans(id, name, group_id)')
    .eq('occurs_on', tomorrow);

  let notifiedCount = 0;

  for (const instance of instances ?? []) {
    const plan = (instance as any).plan as { id: string; name: string; group_id: string } | null;
    if (!plan) continue;

    const [{ data: members }, { data: responses }] = await Promise.all([
      supabase.from('group_members').select('user_id').eq('group_id', plan.group_id),
      supabase.from('plan_responses').select('user_id').eq('plan_instance_id', instance.id),
    ]);

    const respondedIds = new Set((responses ?? []).map((r) => r.user_id));
    const pendingIds = (members ?? []).map((m) => m.user_id).filter((id) => !respondedIds.has(id));

    if (pendingIds.length > 0) {
      await notifyMany(pendingIds, {
        type: 'plan_reminder',
        title: `${plan.name} is tomorrow`,
        body: "You haven't responded yet.",
        link: `/planner/${plan.id}`,
      });
      notifiedCount += pendingIds.length;
    }
  }

  return NextResponse.json({ ok: true, instancesChecked: instances?.length ?? 0, notificationsSent: notifiedCount });
}
