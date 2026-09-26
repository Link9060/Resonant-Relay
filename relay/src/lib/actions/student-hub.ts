import { createClient } from '@/lib/supabase/client';
import type { GoogleService } from '@/lib/google/scopes';

export async function disconnectGoogle(_service: GoogleService) {
  const supabase = createClient();
  const { data: accountData, error: accountError } = await supabase.functions.invoke('calendar-hub', {
    body: { action: 'accounts' },
  });
  if (accountError) throw accountError;

  const googleAccounts = (accountData?.accounts ?? []).filter((account: any) => account.provider === 'google');
  if (googleAccounts.length === 0) return;
  if (googleAccounts.length > 1) {
    throw new Error('Multiple Google calendars are connected. Disconnect the account from Calendar settings.');
  }

  const { error } = await supabase.functions.invoke('calendar-hub', {
    body: { action: 'disconnect', accountId: googleAccounts[0].id },
  });
  if (error) throw error;
}
