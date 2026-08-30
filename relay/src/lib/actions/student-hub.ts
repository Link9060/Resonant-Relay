import { createClient } from '@/lib/supabase/client';
import type { GoogleService } from '@/lib/google/scopes';

export async function disconnectGoogle(service: GoogleService) {
  const { error } = await createClient().functions.invoke('google-hub', { body: { action: 'disconnect', service } });
  if (error) throw error;
}
