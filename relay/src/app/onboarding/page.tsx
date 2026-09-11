'use client';

import { PageLoading } from '@/components/page-loading';
import { ThemeToggle } from '@/components/theme-toggle';
import { appPageUrl, BASE_PATH, IS_BETA } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { formatRelayNumber } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Smartphone,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type OnboardingProfile = {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  relay_number: string;
  avatar_url: string | null;
  school: string | null;
  graduation_year: number | null;
  discoverable_in_contacts: boolean;
  show_school_in_discovery: boolean;
  onboarding_completed_at: string | null;
  role: 'owner' | 'admin' | 'moderator' | 'user';
};

type Step = 'welcome' | 'name' | 'username' | 'profile' | 'tour' | 'complete';
type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function OnboardingPage() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [step, setStep] = useState<Step>('welcome');
  const [tourOnly, setTourOnly] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [school, setSchool] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [discoverable, setDiscoverable] = useState(true);
  const [showSchool, setShowSchool] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [availability, setAvailability] = useState<Availability>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState<{ username: string; relay_number: string } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.replace(appPageUrl('/login'));
        return;
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id,display_name,first_name,last_name,username,relay_number,avatar_url,school,graduation_year,discoverable_in_contacts,show_school_in_discovery,onboarding_completed_at,role')
        .eq('id', user.id)
        .single();

      if (!active) return;
      if (profileError || !data) {
        setError('Relay could not load your profile. Try signing in again.');
        return;
      }

      const typed = data as OnboardingProfile;
      const params = new URLSearchParams(window.location.search);
      const replay = params.get('tour') === '1';

      if (typed.onboarding_completed_at && !replay) {
        window.location.replace(appPageUrl(IS_BETA ? '/space' : '/'));
        return;
      }

      const displayParts = typed.display_name.trim().split(/\s+/).filter(Boolean);
      setProfile(typed);
      setFirstName(typed.first_name ?? displayParts[0] ?? '');
      setLastName(typed.last_name ?? displayParts.slice(1).join(' '));
      setUsername(typed.username ?? '');
      setSchool(typed.school ?? '');
      setGraduationYear(typed.graduation_year ? String(typed.graduation_year) : '');
      setAvatarUrl(typed.avatar_url ?? '');
      setDiscoverable(typed.discoverable_in_contacts);
      setShowSchool(typed.show_school_in_discovery);
      setTourOnly(replay);
      setStep(replay ? 'tour' : 'welcome');
    })();

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (step !== 'username') return;
    const clean = normalizeUsername(username);
    if (!usernameValid(clean)) {
      setAvailability(clean.length ? 'invalid' : 'idle');
      return;
    }

    setAvailability('checking');
    const timer = window.setTimeout(() => {
      void (async () => {
        const { data, error: checkError } = await (createClient() as any).rpc('username_available', { p_username: clean });
        if (checkError) {
          setAvailability('idle');
          return;
        }
        setAvailability(data === true ? 'available' : 'taken');
      })();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [step, username]);

  const suggestions = useMemo(() => usernameSuggestions(firstName, lastName, graduationYear), [firstName, lastName, graduationYear]);
  const tourSlides = [
    {
      icon: <LayoutDashboard size={24} />,
      eyebrow: 'Dashboard',
      title: 'Your day, without the digging.',
      body: 'Tasks, upcoming events, recent mail, and new chats all land on Dashboard. On iPhone, this is your main quick-view hub.',
    },
    {
      icon: <MessageCircle size={24} />,
      eyebrow: 'Chats',
      title: 'Message people and groups.',
      body: 'Use Chats for direct messages and group conversations. Replies, reactions, attachments, and message tools stay close to the conversation.',
    },
    {
      icon: <UsersRound size={24} />,
      eyebrow: 'Contacts',
      title: 'Find people without oversharing.',
      body: 'Search by name or @username, discover mutual connections, or add someone directly with their Relay Number. You control whether you appear in Discover.',
    },
    {
      icon: <Smartphone size={24} />,
      eyebrow: 'Relay Mobile',
      title: 'Phone for quick actions. Mac for deep work.',
      body: 'On iPhone, Relay focuses on Dashboard, Chats, Contacts, Settings, and urgent staff work. Full Mail, Calendar, Planner, analytics, and advanced controls stay Mac-first.',
    },
  ];

  if (!profile && !error) return <PageLoading label="Setting up Relay…" />;

  function nextFromName() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter both your first and last name.');
      return;
    }
    if (firstName.trim().length > 40 || lastName.trim().length > 60) {
      setError('Keep your first name under 40 characters and last name under 60.');
      return;
    }
    setStep('username');
  }

  function nextFromUsername() {
    setError(null);
    const clean = normalizeUsername(username);
    if (!usernameValid(clean)) {
      setError('Use 3–20 letters, numbers, or underscores.');
      return;
    }
    if (availability !== 'available') {
      setError(availability === 'taken' ? 'That username is already taken.' : 'Wait for Relay to confirm that username is available.');
      return;
    }
    setUsername(clean);
    setStep('profile');
  }

  async function saveProfileAndStartTour() {
    if (!accepted) {
      setError('Accept Relay’s Terms and Privacy Policy to continue.');
      return;
    }

    const year = graduationYear.trim() ? Number(graduationYear) : null;
    if (year !== null && (!Number.isInteger(year) || year < new Date().getFullYear() - 4 || year > new Date().getFullYear() + 12)) {
      setError('Choose a valid graduation year.');
      return;
    }

    setBusy(true);
    setError(null);
    const { data, error: saveError } = await (createClient() as any).rpc('save_onboarding_profile', {
      p_first_name: firstName.trim(),
      p_last_name: lastName.trim(),
      p_username: normalizeUsername(username),
      p_school: school.trim() || null,
      p_graduation_year: year,
      p_avatar_url: avatarUrl.trim() || null,
      p_discoverable: discoverable,
      p_show_school: showSchool && discoverable,
    });
    setBusy(false);

    if (saveError) {
      setError(humanizeRpcError(saveError.message));
      return;
    }

    setProfile((current) => current ? { ...current, ...(data ?? {}) } : current);
    setTourIndex(0);
    setStep('tour');
  }

  async function finishTour() {
    if (tourOnly) {
      window.location.replace(appPageUrl('/profile'));
      return;
    }

    setBusy(true);
    setError(null);
    const { data, error: finishError } = await (createClient() as any).rpc('finish_onboarding', { p_accept_terms: accepted });
    setBusy(false);
    if (finishError) {
      setError(humanizeRpcError(finishError.message));
      return;
    }

    setFinished({
      username: data?.username ?? normalizeUsername(username),
      relay_number: data?.relay_number ?? profile?.relay_number ?? '',
    });
    setStep('complete');
  }

  const progressStep = step === 'welcome' ? 0 : step === 'name' ? 1 : step === 'username' ? 2 : step === 'profile' ? 3 : 4;

  return (
    <main className="min-h-[100dvh] bg-canvas text-ink">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
        <header className="flex min-h-12 items-center justify-between gap-4">
          <div className="relay-brand-lockup">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE_PATH}/relay-icon.svg`} alt="" className="h-8 w-8 dark:invert" />
            <span className="font-display text-xl font-medium tracking-tight">Relay</span>
          </div>
          <ThemeToggle />
        </header>

        {!tourOnly && step !== 'complete' && (
          <div className="mt-5 grid grid-cols-4 gap-1.5" aria-label={`Setup step ${Math.max(1, progressStep)} of 4`}>
            {[1, 2, 3, 4].map((item) => (
              <span key={item} className={`h-1 rounded-full ${progressStep >= item ? 'bg-ink' : 'bg-border'}`} />
            ))}
          </div>
        )}

        <div className="flex flex-1 items-center py-8 sm:py-12">
          <section className="w-full">
            {error && (
              <div className="mb-5 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink">{error}</div>
            )}

            {step === 'welcome' && (
              <OnboardingPanel eyebrow="Welcome to Relay" title="Let’s make this yours." body="A few basics, a username, and a 30-second tour. Then you’re in.">
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <MiniPoint title="Your identity" text="A real name plus a unique @username." />
                  <MiniPoint title="Your privacy" text="You choose whether Discover can surface you." />
                  <MiniPoint title="Your bearings" text="A tiny tour so Relay makes sense immediately." />
                </div>
                <PrimaryButton onClick={() => { setError(null); setStep('name'); }}>Continue <ArrowRight size={16} /></PrimaryButton>
              </OnboardingPanel>
            )}

            {step === 'name' && (
              <OnboardingPanel eyebrow="01 · Identity" title="What should people call you?" body="Use the name people at school or work would recognize.">
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <Field label="First name">
                    <input autoFocus autoComplete="given-name" maxLength={40} value={firstName} onChange={(e) => setFirstName(e.target.value)} className="onboarding-input" placeholder="First name" />
                  </Field>
                  <Field label="Last name">
                    <input autoComplete="family-name" maxLength={60} value={lastName} onChange={(e) => setLastName(e.target.value)} className="onboarding-input" placeholder="Last name" />
                  </Field>
                </div>
                <NavButtons back={() => setStep('welcome')} next={nextFromName} />
              </OnboardingPanel>
            )}

            {step === 'username' && (
              <OnboardingPanel eyebrow="02 · Username" title="Pick your @username." body="This is the easy way for people to search for you. Your private Relay Number still works for exact adds.">
                <div className="mt-7">
                  <label className="block">
                    <span className="text-xs font-medium text-ink-muted">Username</span>
                    <div className="mt-1.5 flex min-h-12 items-center rounded-xl border border-border bg-surface-raised px-3 focus-within:border-ink-muted">
                      <span className="text-sm text-ink-faint">@</span>
                      <input
                        autoFocus
                        autoCapitalize="none"
                        autoCorrect="off"
                        maxLength={20}
                        value={username}
                        onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                        className="min-w-0 flex-1 bg-transparent px-1 py-3 text-base text-ink outline-none"
                        placeholder="yourusername"
                      />
                      <AvailabilityMark value={availability} />
                    </div>
                  </label>
                  <p className="mt-2 text-xs text-ink-faint">3–20 characters · letters, numbers, underscores · usernames are shown lowercase.</p>
                  {availability === 'available' && <p className="mt-2 text-xs font-medium text-ink">@{normalizeUsername(username)} is available.</p>}
                  {availability === 'taken' && <p className="mt-2 text-xs text-ink-muted">That one is taken. Try one of these:</p>}
                  {(availability === 'taken' || (!username && suggestions.length > 0)) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestions.map((item) => (
                        <button key={item} type="button" onClick={() => setUsername(item)} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-ink hover:bg-surface-raised">@{item}</button>
                      ))}
                    </div>
                  )}
                </div>
                <NavButtons back={() => setStep('name')} next={nextFromUsername} nextDisabled={availability !== 'available'} />
              </OnboardingPanel>
            )}

            {step === 'profile' && (
              <OnboardingPanel eyebrow="03 · Profile & privacy" title="A little context. Nothing invasive." body="School and graduation year are optional. School visibility starts off unless you choose otherwise.">
                <div className="mt-7 grid gap-4">
                  <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-ink-muted">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : <UserRound size={22} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink">{firstName} {lastName}</div>
                      <div className="mt-0.5 text-xs text-ink-faint">@{normalizeUsername(username)}</div>
                    </div>
                  </div>

                  <Field label="School" hint="Optional">
                    <input maxLength={80} value={school} onChange={(e) => setSchool(e.target.value)} className="onboarding-input" placeholder="Your school" />
                  </Field>
                  <Field label="Graduation year" hint="Optional">
                    <input inputMode="numeric" pattern="[0-9]*" maxLength={4} value={graduationYear} onChange={(e) => setGraduationYear(e.target.value.replace(/\D/g, '').slice(0, 4))} className="onboarding-input" placeholder="2028" />
                  </Field>
                  <Field label="Profile photo link" hint="Optional · your sign-in photo is already used when available">
                    <input inputMode="url" maxLength={500} value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="onboarding-input" placeholder="https://…" />
                  </Field>

                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <PrivacySwitch checked={discoverable} title="Appear in Discover" text="Let people search for your name or @username and see mutual-contact/shared-group context." onChange={(next) => { setDiscoverable(next); if (!next) setShowSchool(false); }} />
                    <div className="mt-4 border-t border-border pt-4">
                      <PrivacySwitch checked={showSchool} disabled={!discoverable || !school.trim()} title="Show my school in Discover" text="Off by default. Your school only appears when you explicitly enable this." onChange={setShowSchool} />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3">
                    <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-current" />
                    <span className="text-xs leading-5 text-ink-muted">I agree to Relay’s <a href={appPageUrl('/terms')} target="_blank" className="text-ink underline underline-offset-2">Terms</a> and acknowledge the <a href={appPageUrl('/privacy')} target="_blank" className="text-ink underline underline-offset-2">Privacy Policy</a>.</span>
                  </label>
                </div>
                <NavButtons back={() => setStep('username')} next={() => void saveProfileAndStartTour()} nextLabel="Start quick tour" nextDisabled={busy || !accepted} busy={busy} />
              </OnboardingPanel>
            )}

            {step === 'tour' && tourSlides.length > 0 && (
              <OnboardingPanel eyebrow={`${tourSlides[tourIndex]!.eyebrow} · ${tourIndex + 1}/${tourSlides.length}`} title={tourSlides[tourIndex]!.title} body={tourSlides[tourIndex]!.body}>
                <div className="mt-8 flex min-h-40 items-center justify-center rounded-3xl border border-border bg-surface">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-canvas">{tourSlides[tourIndex]!.icon}</div>
                </div>
                <div className="mt-6 flex gap-1.5">
                  {tourSlides.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= tourIndex ? 'bg-ink' : 'bg-border'}`} />)}
                </div>
                <div className="mt-7 flex items-center justify-between gap-3">
                  <button type="button" disabled={busy} onClick={() => void finishTour()} className="min-h-11 px-2 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50">{tourOnly ? 'Back to Settings' : 'Skip tour'}</button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => tourIndex < tourSlides.length - 1 ? setTourIndex(tourIndex + 1) : void finishTour()}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-medium text-canvas disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" /> : tourIndex < tourSlides.length - 1 ? <>Next <ArrowRight size={16} /></> : tourOnly ? 'Done' : <>Finish setup <Check size={16} /></>}
                  </button>
                </div>
              </OnboardingPanel>
            )}

            {step === 'complete' && finished && (
              <OnboardingPanel eyebrow="You’re in" title={`Welcome to Relay, ${firstName}.`} body="Your account is ready. People can now find you the ways you chose.">
                <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
                  <div className="border-b border-border px-5 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">Username</div>
                    <div className="mt-1 font-display text-2xl font-medium text-ink">@{finished.username}</div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">Relay Number</div>
                    <div className="mt-1 font-display text-2xl font-medium text-ink">{formatRelayNumber(finished.relay_number)}</div>
                    <div className="mt-1 text-xs text-ink-faint">Use this when you want an exact, direct add.</div>
                  </div>
                </div>
                <PrimaryButton onClick={() => window.location.replace(appPageUrl(IS_BETA ? '/space' : '/'))}>Open Relay <ArrowRight size={16} /></PrimaryButton>
              </OnboardingPanel>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function OnboardingPanel({ eyebrow, title, body, children }: { eyebrow: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">{eyebrow}</div>
      <h1 className="mt-2 max-w-xl font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">{body}</p>
      {children}
    </div>
  );
}

function MiniPoint({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-border bg-surface p-4"><div className="text-sm font-medium text-ink">{title}</div><p className="mt-1 text-xs leading-5 text-ink-faint">{text}</p></div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="flex items-center justify-between gap-3 text-xs font-medium text-ink-muted"><span>{label}</span>{hint && <span className="font-normal text-ink-faint">{hint}</span>}</span><span className="mt-1.5 block">{children}</span></label>;
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-medium text-canvas sm:w-auto">{children}</button>;
}

function NavButtons({ back, next, nextLabel = 'Continue', nextDisabled = false, busy = false }: { back: () => void; next: () => void; nextLabel?: string; nextDisabled?: boolean; busy?: boolean }) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      <button type="button" onClick={back} disabled={busy} className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50"><ArrowLeft size={15} />Back</button>
      <button type="button" onClick={next} disabled={nextDisabled || busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-medium text-canvas disabled:opacity-40">{busy ? <Loader2 size={16} className="animate-spin" /> : <>{nextLabel}<ArrowRight size={15} /></>}</button>
    </div>
  );
}

function PrivacySwitch({ checked, disabled = false, title, text, onChange }: { checked: boolean; disabled?: boolean; title: string; text: string; onChange: (next: boolean) => void }) {
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="flex items-start justify-between gap-4">
        <div><div className="text-sm font-medium text-ink">{title}</div><p className="mt-1 text-xs leading-5 text-ink-faint">{text}</p></div>
        <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition-colors ${checked ? 'border-ink bg-ink' : 'border-border bg-canvas'}`}>
          <span className={`absolute top-0.5 h-[22px] w-[22px] rounded-full transition-all ${checked ? 'left-[22px] bg-canvas' : 'left-0.5 bg-ink-muted'}`} />
        </button>
      </div>
    </div>
  );
}

function AvailabilityMark({ value }: { value: Availability }) {
  if (value === 'checking') return <Loader2 size={16} className="shrink-0 animate-spin text-ink-faint" />;
  if (value === 'available') return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-canvas"><Check size={13} /></span>;
  if (value === 'taken' || value === 'invalid') return <span className="shrink-0 text-xs text-ink-faint">Unavailable</span>;
  return null;
}

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

function usernameValid(value: string) {
  return /^[a-z0-9_]{3,20}$/.test(value);
}

function usernameSuggestions(first: string, last: string, year: string) {
  const firstPart = first.toLowerCase().replace(/[^a-z0-9]/g, '');
  const lastPart = last.toLowerCase().replace(/[^a-z0-9]/g, '');
  const yearPart = year.replace(/\D/g, '').slice(-2);
  const values = [
    `${firstPart}${lastPart}`,
    `${firstPart}_${lastPart}`,
    yearPart ? `${firstPart}${lastPart}${yearPart}` : '',
    yearPart ? `${firstPart}_${yearPart}` : '',
  ].map((value) => value.slice(0, 20)).filter((value) => usernameValid(value));
  return [...new Set(values)].slice(0, 4);
}

function humanizeRpcError(raw: string) {
  const message = String(raw ?? '').replace(/^.*?: /, '').trim();
  if (message.toLowerCase().includes('username unavailable')) return 'That username is already taken.';
  if (message.toLowerCase().includes('reserved')) return 'That username is reserved by Relay. Try another one.';
  return message || 'Relay could not save that right now.';
}
