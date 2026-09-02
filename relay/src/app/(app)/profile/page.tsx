'use client';

import { PushToggle } from '@/components/notifications/push-toggle';
import { PageLoading } from '@/components/page-loading';
import { SignOutButton } from '@/components/profile/sign-out-button';
import { STARTUP_SESSION_KEY } from '@/components/startup-sequence';
import { createClient } from '@/lib/supabase/client';
import { formatRelayNumber } from '@/lib/utils';
import { Check, Loader2, Play, UserRound } from 'lucide-react';
import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';

type EditableProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  relay_number: string;
  school: string | null;
  bio: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('id,display_name,avatar_url,relay_number,school,bio').eq('id', user.id).single();
      setProfile(data);
    })();
  }, []);

  if (!profile) return <PageLoading />;

  function update<Field extends keyof EditableProfile>(field: Field, value: EditableProfile[Field]) {
    setProfile((current) => current ? { ...current, [field]: value } : current);
    setSaved(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    const currentProfile = profile;
    const displayName = currentProfile.display_name.trim();
    const avatarUrl = currentProfile.avatar_url?.trim() || null;
    if (!displayName) {
      setError('Your name cannot be blank.');
      return;
    }
    if (avatarUrl) {
      try {
        if (new URL(avatarUrl).protocol !== 'https:') throw new Error();
      } catch {
        setError('Use a full HTTPS link for your profile photo.');
        return;
      }
    }

    setSaving(true);
    setError(null);
    const changes = {
      display_name: displayName,
      bio: currentProfile.bio?.trim() || null,
      school: currentProfile.school?.trim() || null,
      avatar_url: avatarUrl,
    };
    const { error: updateError } = await createClient().from('profiles').update(changes).eq('id', currentProfile.id);
    setSaving(false);
    if (updateError) {
      setError('Your profile could not be saved.');
      return;
    }
    setProfile((current) => current ? { ...current, ...changes } : current);
    setSaved(true);
  }

  function replayStartup() {
    sessionStorage.removeItem(STARTUP_SESSION_KEY);
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Profile</h1>
          <p className="mt-1 text-sm text-ink-faint">Choose how people see you across Relay.</p>
        </div>
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-xl font-medium text-ink">
          {profile.avatar_url ? <Image src={profile.avatar_url} alt="" fill sizes="64px" className="object-cover" unoptimized /> : <UserRound size={25} />}
        </div>
      </div>

      <form onSubmit={save} className="mt-7 space-y-5">
        <ProfileField label="Name" hint="Shown in chats and contacts.">
          <input value={profile.display_name} maxLength={40} onChange={(event) => update('display_name', event.target.value)} className="profile-input" autoComplete="name" />
        </ProfileField>
        <ProfileField label="Bio" hint={`${profile.bio?.length ?? 0}/160`}>
          <textarea value={profile.bio ?? ''} maxLength={160} rows={3} onChange={(event) => update('bio', event.target.value)} placeholder="A little about you" className="profile-input resize-none" />
        </ProfileField>
        <ProfileField label="School" hint="Optional">
          <input value={profile.school ?? ''} maxLength={80} onChange={(event) => update('school', event.target.value)} placeholder="Your school" className="profile-input" />
        </ProfileField>
        <ProfileField label="Profile photo link" hint="Optional HTTPS image URL">
          <input value={profile.avatar_url ?? ''} maxLength={500} onChange={(event) => update('avatar_url', event.target.value)} placeholder="https://..." className="profile-input" inputMode="url" />
        </ProfileField>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-canvas disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
          {saved ? 'Saved' : 'Save profile'}
        </button>
      </form>

      <div className="mt-8 rounded-md border border-border p-4">
        <p className="text-xs uppercase tracking-wide text-ink-faint">Your Relay Number</p>
        <p className="mt-1 font-display text-3xl font-medium tracking-tight text-ink">{formatRelayNumber(profile.relay_number)}</p>
        <p className="mt-2 text-xs text-ink-faint">Share this number when you want someone to add you.</p>
      </div>

      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-sm font-medium text-ink">Preferences</h2>
        <div className="mt-3 flex flex-col items-start gap-3">
          <PushToggle />
          <button type="button" onClick={replayStartup} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface">
            <Play size={15} />Replay startup animation
          </button>
        </div>
      </section>

      <div className="mt-8"><SignOutButton /></div>
    </div>
  );
}

function ProfileField({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-4 text-xs font-medium text-ink-muted"><span>{label}</span><span className="font-normal text-ink-faint">{hint}</span></span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}
