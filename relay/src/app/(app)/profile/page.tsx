'use client';

import { PushToggle } from '@/components/notifications/push-toggle';
import { PageLoading } from '@/components/page-loading';
import { SignOutButton } from '@/components/profile/sign-out-button';
import { AccountDataControls } from '@/components/profile/account-data-controls';
import { appPageUrl } from '@/lib/config';
import { STARTUP_SESSION_KEY } from '@/components/startup-sequence';
import { AppRole, getRolePreview, setRolePreview } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { cn, formatRelayNumber } from '@/lib/utils';
import { ArrowRight, Check, Eye, Loader2, Play, ShieldCheck, UserRound } from 'lucide-react';
import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';

type EditableProfile = {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  username_changed_at: string | null;
  avatar_url: string | null;
  relay_number: string;
  school: string | null;
  graduation_year: number | null;
  bio: string | null;
  role: AppRole;
};

const PREVIEW_ROLES: { role: AppRole; label: string; mark: string }[] = [
  { role: 'owner', label: 'Owner', mark: '◆' },
  { role: 'admin', label: 'Admin', mark: '◇' },
  { role: 'moderator', label: 'Moderator', mark: '●' },
  { role: 'user', label: 'User', mark: '○' },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [originalUsername, setOriginalUsername] = useState<string | null>(null);
  const [previewRole, setPreviewRoleState] = useState<AppRole>('owner');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('id,display_name,first_name,last_name,username,username_changed_at,avatar_url,relay_number,school,graduation_year,bio,role').eq('id', user.id).single();
      if (data) {
        const parts = String(data.display_name ?? '').trim().split(/\s+/).filter(Boolean);
        const typed = {
          ...data,
          first_name: data.first_name ?? parts[0] ?? '',
          last_name: data.last_name ?? parts.slice(1).join(' '),
        } as EditableProfile;
        setProfile(typed);
        setOriginalUsername(typed.username);
        setPreviewRoleState(getRolePreview(typed.role));
      }
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
    const firstName = currentProfile.first_name?.trim() ?? '';
    const lastName = currentProfile.last_name?.trim() ?? '';
    const nextUsername = normalizeUsername(currentProfile.username ?? '');
    const avatarUrl = currentProfile.avatar_url?.trim() || null;

    if (!firstName || !lastName) {
      setError('Enter both your first and last name.');
      return;
    }
    if (firstName.length > 40 || lastName.length > 60) {
      setError('Keep your first name under 40 characters and last name under 60.');
      return;
    }
    if (nextUsername && !/^[a-z0-9_]{3,20}$/.test(nextUsername)) {
      setError('Usernames use 3–20 letters, numbers, or underscores.');
      return;
    }
    if (originalUsername && !nextUsername) {
      setError('Choose a username instead of leaving it blank.');
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
    setSaved(false);
    setError(null);

    const { data, error: saveError } = await (createClient() as any).rpc('save_profile_settings', {
      p_first_name: firstName,
      p_last_name: lastName,
      p_username: nextUsername || '',
      p_bio: currentProfile.bio?.trim() || null,
      p_school: currentProfile.school?.trim() || null,
      p_graduation_year: currentProfile.graduation_year || null,
      p_avatar_url: avatarUrl,
    });

    setSaving(false);

    if (saveError) {
      const raw = String(saveError.message ?? '').toLowerCase();
      if (raw.includes('username unavailable')) setError('That username is already taken.');
      else if (raw.includes('username is reserved')) setError('That username is reserved by Relay.');
      else if (raw.includes('changed again after')) setError(saveError.message);
      else if (raw.includes('graduation year')) setError('Choose a valid graduation year.');
      else if (raw.includes('profile photo')) setError('Use a full HTTPS link for your profile photo.');
      else setError(saveError.message || 'Your profile could not be saved.');
      return;
    }

    const savedProfile = data as Partial<EditableProfile> | null;
    setProfile((current) => current ? { ...current, ...savedProfile } : current);
    setOriginalUsername((savedProfile?.username ?? nextUsername) || null);
    setSaved(true);
  }

  function replayStartup() {
    sessionStorage.removeItem(STARTUP_SESSION_KEY);
    window.location.reload();
  }

  function changePreviewRole(role: AppRole) {
    setRolePreview(role);
    setPreviewRoleState(role);
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
        <div className="grid gap-4 sm:grid-cols-2">
          <ProfileField label="First name" hint="Required">
            <input value={profile.first_name ?? ''} maxLength={40} onChange={(event) => update('first_name', event.target.value)} className="profile-input" autoComplete="given-name" />
          </ProfileField>
          <ProfileField label="Last name" hint="Required">
            <input value={profile.last_name ?? ''} maxLength={60} onChange={(event) => update('last_name', event.target.value)} className="profile-input" autoComplete="family-name" />
          </ProfileField>
        </div>
        <ProfileField label="Username" hint={profile.username_changed_at ? 'Changes have a 14-day cooldown' : 'Searchable in Discover'}>
          <div className="flex items-center rounded-md border border-border bg-surface-raised px-3 focus-within:border-ink-muted">
            <span className="text-sm text-ink-faint">@</span>
            <input value={profile.username ?? ''} maxLength={20} autoCapitalize="none" autoCorrect="off" onChange={(event) => update('username', normalizeUsername(event.target.value))} placeholder="choose_username" className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-ink outline-none" />
          </div>
        </ProfileField>
        <ProfileField label="Bio" hint={`${profile.bio?.length ?? 0}/160`}>
          <textarea value={profile.bio ?? ''} maxLength={160} rows={3} onChange={(event) => update('bio', event.target.value)} placeholder="A little about you" className="profile-input resize-none" />
        </ProfileField>
        <ProfileField label="School" hint="Optional">
          <input value={profile.school ?? ''} maxLength={80} onChange={(event) => update('school', event.target.value)} placeholder="Your school" className="profile-input" />
        </ProfileField>
        <ProfileField label="Graduation year" hint="Optional">
          <input value={profile.graduation_year ?? ''} inputMode="numeric" maxLength={4} onChange={(event) => update('graduation_year', event.target.value ? Number(event.target.value.replace(/\D/g, '').slice(0, 4)) : null)} placeholder="2028" className="profile-input" />
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
        {profile.username && <><p className="text-xs uppercase tracking-wide text-ink-faint">Username</p><p className="mt-1 font-display text-xl font-medium tracking-tight text-ink">@{profile.username}</p></>}
        <p className={`${profile.username ? 'mt-4 border-t border-border pt-4' : ''} text-xs uppercase tracking-wide text-ink-faint`}>Your Relay Number</p>
        <p className="mt-1 font-display text-3xl font-medium tracking-tight text-ink">{formatRelayNumber(profile.relay_number)}</p>
        <p className="mt-2 text-xs text-ink-faint">Share this number when you want someone to add you directly.</p>
      </div>

      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-sm font-medium text-ink">Preferences</h2>
        <div className="mt-3 flex flex-col items-start gap-3">
          <PushToggle />
          <a href={appPageUrl('/onboarding?tour=1')} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"><Play size={15} />Replay Relay tour</a>
          <button type="button" onClick={replayStartup} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface">
            <Play size={15} />Replay startup animation
          </button>
        </div>
      </section>

      {profile.role === 'owner' && (
        <section className="mt-8 border-t border-border pt-6">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5">
            <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:24px_24px]" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border bg-canvas px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink">◆ Owner</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-ink-faint"><span className="h-1.5 w-1.5 rounded-full bg-ink" />Full access</span>
                  </div>
                  <h2 className="mt-3 text-base font-semibold text-ink">Owner Tools</h2>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">Preview lower permission levels without changing your real account or losing Owner access.</p>
                </div>
                <ShieldCheck size={19} className="shrink-0 text-ink-faint" />
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-muted"><Eye size={13} />Preview interface as</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PREVIEW_ROLES.map((option) => (
                    <button key={option.role} type="button" onClick={() => changePreviewRole(option.role)} className={cn('rounded-lg border px-3 py-2.5 text-left transition-colors', previewRole === option.role ? 'border-ink bg-ink text-canvas' : 'border-border bg-canvas text-ink-muted hover:bg-surface-raised hover:text-ink')}>
                      <div className="text-sm font-semibold">{option.mark}</div><div className="mt-1 text-[10px] font-medium uppercase tracking-wide">{option.label}</div>
                    </button>
                  ))}
                </div>
                {previewRole !== 'owner' && <div className="mt-3 rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-ink-muted">Preview mode is active. Your real account remains <strong className="text-ink">Owner</strong>.</div>}
              </div>

              <a href={appPageUrl('/admin')} className="mt-4 flex items-center justify-between rounded-xl border border-border bg-canvas px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-raised">
                <span className="flex items-center gap-2"><ShieldCheck size={15} />Open Relay Control Center</span><ArrowRight size={14} className="text-ink-faint" />
              </a>
            </div>
          </div>
        </section>
      )}

      <section className="mt-8 border-t border-border pt-6"><h2 className="text-sm font-medium text-ink">Privacy and terms</h2><div className="mt-3 flex gap-3 text-sm"><a href={appPageUrl('/privacy')} className="text-ink-muted underline underline-offset-4 hover:text-ink">Privacy policy</a><a href={appPageUrl('/terms')} className="text-ink-muted underline underline-offset-4 hover:text-ink">Terms</a></div></section>

      <AccountDataControls />
      <div className="mt-8"><SignOutButton /></div>
    </div>
  );
}

function ProfileField({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return <label className="block"><span className="flex items-center justify-between gap-4 text-xs font-medium text-ink-muted"><span>{label}</span><span className="font-normal text-ink-faint">{hint}</span></span><span className="mt-1.5 block">{children}</span></label>;
}

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}
