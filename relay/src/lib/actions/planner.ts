import { createClient } from '@/lib/supabase/client';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export interface CreatePlanInput {
  groupId: string;
  name: string;
  notes: string;
  responseType: 'rsvp' | 'select_option' | 'custom_text';
  options: string[];
  responsePrompt: string;
  repeatRule: 'never' | 'daily' | 'weekly' | 'custom';
  startsOn: string;
  repeatUntil: string | null;
  customDates: string[];
  startTime: string | null;
  endTime: string | null;
}

export interface UpdatePlanInput {
  planId: string;
  name: string;
  notes: string;
  repeatRule: 'never' | 'daily' | 'weekly' | 'custom';
  startsOn: string;
  repeatUntil: string | null;
  customDates: string[];
  startTime: string | null;
  endTime: string | null;
}

export async function createPlan(input: CreatePlanInput): Promise<ActionResult<{ planId: string }>> {
  const supabase = createClient();
  const { data, error } = await (supabase.rpc as any)('create_plan_v3', {
    p_group_id: input.groupId,
    p_name: input.name,
    p_notes: input.notes || null,
    p_response_type: input.responseType,
    p_options: input.responseType === 'select_option' ? input.options.filter((option) => option.trim()) : null,
    p_response_prompt: input.responseType === 'custom_text' ? input.responsePrompt.trim() : null,
    p_repeat_rule: input.repeatRule,
    p_starts_on: input.startsOn,
    p_repeat_until: input.repeatUntil,
    p_custom_dates: input.repeatRule === 'custom' ? input.customDates : null,
    p_start_time: input.startTime,
    p_end_time: input.startTime ? input.endTime : null,
  });

  if (error) return { ok: false, error: error.message };
  if (typeof data !== 'string') return { ok: false, error: 'Relay could not create that plan.' };
  return { ok: true, data: { planId: data } };
}

export async function updatePlan(input: UpdatePlanInput): Promise<ActionResult<{ planId: string }>> {
  const supabase = createClient();
  const { data, error } = await (supabase.rpc as any)('update_plan_v1', {
    p_plan_id: input.planId,
    p_name: input.name,
    p_notes: input.notes || null,
    p_repeat_rule: input.repeatRule,
    p_starts_on: input.startsOn,
    p_repeat_until: input.repeatRule === 'daily' || input.repeatRule === 'weekly' ? input.repeatUntil : null,
    p_custom_dates: input.repeatRule === 'custom' ? input.customDates : null,
    p_start_time: input.startTime,
    p_end_time: input.startTime ? input.endTime : null,
  });

  if (error) return { ok: false, error: error.message };
  if (typeof data !== 'string') return { ok: false, error: 'Relay could not update that plan.' };
  return { ok: true, data: { planId: data } };
}

export async function submitPlanResponse(
  instanceId: string,
  response: { optionId: string } | { rsvpStatus: 'yes' | 'no' | 'maybe' } | { textResponse: string },
): Promise<ActionResult> {
  const { error } = await createClient().rpc('submit_plan_response_v2', {
    p_instance_id: instanceId,
    p_option_id: 'optionId' in response ? response.optionId : null,
    p_rsvp_status: 'rsvpStatus' in response ? response.rsvpStatus : null,
    p_text_response: 'textResponse' in response ? response.textResponse : null,
  });
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined };
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  const { error } = await createClient().rpc('delete_plan', { p_plan_id: planId });
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined };
}
