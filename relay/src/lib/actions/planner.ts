import { createClient } from '@/lib/supabase/client';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
export interface CreatePlanInput {
  groupId: string; name: string; notes: string; responseType: 'rsvp' | 'select_option'; options: string[];
  repeatRule: 'never' | 'daily' | 'weekly' | 'custom'; startsOn: string; repeatUntil: string | null; customDates: string[];
}

export async function createPlan(input: CreatePlanInput): Promise<ActionResult<{ planId: string }>> {
  const { data, error } = await createClient().rpc('create_plan', {
    p_group_id: input.groupId, p_name: input.name, p_notes: input.notes || null,
    p_response_type: input.responseType,
    p_options: input.responseType === 'select_option' ? input.options.filter((o) => o.trim()) : null,
    p_repeat_rule: input.repeatRule, p_starts_on: input.startsOn, p_repeat_until: input.repeatUntil,
    p_custom_dates: input.repeatRule === 'custom' ? input.customDates : null,
  });
  return error ? { ok: false, error: error.message } : { ok: true, data: { planId: data } };
}

export async function submitPlanResponse(instanceId: string, response: { optionId: string } | { rsvpStatus: 'yes' | 'no' | 'maybe' }): Promise<ActionResult> {
  const { error } = await createClient().rpc('submit_plan_response', {
    p_instance_id: instanceId,
    p_option_id: 'optionId' in response ? response.optionId : null,
    p_rsvp_status: 'rsvpStatus' in response ? response.rsvpStatus : null,
  });
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined };
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  const { error } = await createClient().rpc('delete_plan', { p_plan_id: planId });
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined };
}
