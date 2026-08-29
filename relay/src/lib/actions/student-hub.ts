'use server';

import { createClient } from '@/lib/supabase/server';
import { disconnectGoogleIntegration } from '@/lib/google/tokens';
import type { GoogleService } from '@/lib/google/scopes';
import { revalidatePath } from 'next/cache';

export async function disconnectGoogle(service: GoogleService) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await disconnectGoogleIntegration(user.id, service);
  revalidatePath(service === 'calendar' ? '/calendar' : '/email');
}
