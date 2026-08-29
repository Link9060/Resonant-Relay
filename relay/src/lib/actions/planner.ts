'use server';

import { createClient } from '@/lib/supabase/server';
import { notifyMany } from '@/lib/notifications/notify';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export interface CreatePlanInput {
  groupId: string;
  name: string;
  notes: string;
  responseType: 'rsvp' | 'select_option';
  options: string[]; // used only when responseType === 'select_option'
  repeatRule: 'never' | 'daily' | 'weekly' | 'custom';
  startsOn: string; // yyyy-mm-dd
  repeatUntil: string | null; // yyyy-mm-dd or null
  customDates: string[]; // used only when repeatRule === 'custom'
}

export async function createPlan(input: CreatePlanInput): Promise<ActionResult<{ planId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase.rpc('create_plan', {
    p_group_id: input.groupId,
    p_name: input.name,
    p_notes: input.notes || null,
    p_response_type: input.responseType,
    p_options: input.responseType === 'select_option' ? input.options.filter((o) => o.trim()) : null,
    p_repeat_rule: input.repeatRule,
    p_starts_on: input.startsOn,
    p_repeat_until: input.repeatUntil,
    p_custom_dates: input.repeatRule === 'custom' ? input.customDates : null,
  });

  if (error) return { ok: false, error: error.message };

  const [{ data: creatorProfile }, { data: members }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    supabase.from('group_members').select('user_id').eq('group_id', input.groupId),
  ]);

  const recipientIds = (members ?? []).map((m) => m.user_id).filter((id) => id !== user.id);
  await notifyMany(recipientIds, {
    type: 'plan_created',
    title: 'New plan',
    body: `${creatorProfile?.display_name ?? 'Someone'} created "${input.name}".`,
    link: `/planner/${data}`,
  }).catch(() => {});

  revalidatePath('/planner');
  return { ok: true, data: { planId: data } };
}

export async function submitPlanResponse(
  instanceId: string,
  response: { optionId: string } | { rsvpStatus: 'yes' | 'no' | 'maybe' }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('submit_plan_response', {
    p_instance_id: instanceId,
    p_option_id: 'optionId' in response ? response.optionId : null,
    p_rsvp_status: 'rsvpStatus' in response ? response.rsvpStatus : null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/planner', 'layout');
  return { ok: true, data: undefined };
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_plan', { p_plan_id: planId });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/planner');
  redirect('/planner');
}
