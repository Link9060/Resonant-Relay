import { createClient } from '@/lib/supabase/server';
import { formatRelayNumber } from '@/lib/utils';
import { SignOutButton } from '@/components/profile/sign-out-button';

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-md px-4 py-8 md:px-6">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Profile</h1>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-xl font-medium text-ink">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            profile.display_name[0]?.toUpperCase()
          )}
        </div>
        <div>
          <p className="text-lg font-medium text-ink">{profile.display_name}</p>
          {profile.school && <p className="text-sm text-ink-muted">{profile.school}</p>}
        </div>
      </div>

      <div className="mt-8 rounded-md border border-border p-4">
        <p className="text-xs uppercase tracking-wide text-ink-faint">Your Relay Number</p>
        <p className="mt-1 font-display text-3xl font-medium tracking-tight text-ink">
          {formatRelayNumber(profile.relay_number)}
        </p>
        <p className="mt-2 text-xs text-ink-faint">
          Share this so people can add you. It doesn&apos;t reveal anything else about your account.
        </p>
      </div>

      <div className="mt-8">
        <SignOutButton />
      </div>
    </div>
  );
}
