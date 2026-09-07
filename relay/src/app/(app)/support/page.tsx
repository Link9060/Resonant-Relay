'use client';

import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/client';
import { Bug, Lightbulb, LockKeyhole, MessageSquareText, ShieldAlert, UserRoundPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type RequestType = 'bug_report' | 'role_application' | 'feature_request' | 'safety_report' | 'general_feedback' | 'privacy_request';
type RequestStatus = 'new' | 'reviewing' | 'resolved' | 'dismissed';
type RequestedRole = 'moderator' | 'admin';

type MyRequest = {
  id: string;
  request_type: RequestType;
  subject: string;
  requested_role: RequestedRole | null;
  status: RequestStatus;
  staff_note: string | null;
  created_at: string;
};

const TYPES: Array<{
  id: RequestType;
  title: string;
  description: string;
  icon: typeof Bug;
}> = [
  { id: 'bug_report', title: 'Bug Report', description: 'Something in Relay is broken or behaving strangely.', icon: Bug },
  { id: 'role_application', title: 'Staff Application', description: 'Apply to help Relay as a moderator or admin.', icon: UserRoundPlus },
  { id: 'feature_request', title: 'Feature Request', description: 'Suggest an improvement or something Relay should add.', icon: Lightbulb },
  { id: 'safety_report', title: 'Safety / Abuse', description: 'Report a broader safety, spam, or abuse concern.', icon: ShieldAlert },
  { id: 'general_feedback', title: 'General Feedback', description: 'Share feedback that does not fit another category.', icon: MessageSquareText },
  { id: 'privacy_request', title: 'Privacy / Data', description: 'Ask about your Relay data, privacy, or account information.', icon: LockKeyhole },
];

export default function SupportPage() {
  const [requestType, setRequestType] = useState<RequestType>('bug_report');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [requestedRole, setRequestedRole] = useState<RequestedRole>('moderator');
  const [whereItHappened, setWhereItHappened] = useState('');
  const [severity, setSeverity] = useState('normal');
  const [history, setHistory] = useState<MyRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedType = useMemo(() => TYPES.find((type) => type.id === requestType) ?? TYPES[0], [requestType]);

  async function loadHistory() {
    const supabase = createClient() as any;
    const { data, error: historyError } = await supabase
      .from('staff_requests')
      .select('id, request_type, subject, requested_role, status, staff_note, created_at')
      .order('created_at', { ascending: false })
      .limit(12);
    if (historyError) throw historyError;
    setHistory((data ?? []) as MyRequest[]);
  }

  useEffect(() => {
    void loadHistory().catch(() => setHistory([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient() as any;
      const metadata: Record<string, unknown> = {
        source: 'relay_native_support',
        submitted_at: new Date().toISOString(),
      };

      if (requestType === 'bug_report') {
        metadata.where_it_happened = whereItHappened.trim() || null;
        metadata.severity = severity;
        metadata.referrer = typeof document !== 'undefined' ? document.referrer || null : null;
        metadata.user_agent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
        metadata.viewport = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null;
      }

      const { error: submitError } = await supabase.rpc('submit_staff_request', {
        p_request_type: requestType,
        p_subject: subject,
        p_description: description,
        p_requested_role: requestType === 'role_application' ? requestedRole : null,
        p_metadata: metadata,
      });

      if (submitError) throw submitError;

      setSubject('');
      setDescription('');
      setWhereItHappened('');
      setSeverity('normal');
      setSuccess(`${selectedType.title} sent to the right Relay staff queue.`);
      await loadHistory();
    } catch (e: any) {
      setError(e?.message ?? 'Your request could not be submitted.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <PageHeader title="Support & Feedback" />
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Send something straight into Relay's staff system. Your request is automatically routed based on its type.
      </p>

      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TYPES.map((type) => {
          const Icon = type.icon;
          const active = requestType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => {
                setRequestType(type.id);
                setError(null);
                setSuccess(null);
              }}
              className={`rounded-xl border p-4 text-left transition-colors ${active ? 'border-ink bg-surface-raised' : 'border-border bg-surface hover:bg-surface-raised'}`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Icon size={17} />{type.title}</div>
              <p className="mt-1.5 text-xs leading-5 text-ink-muted">{type.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
        <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-5 md:p-6">
          <div>
            <h2 className="text-lg font-semibold text-ink">{selectedType.title}</h2>
            <p className="mt-1 text-sm text-ink-muted">{routingCopy(requestType)}</p>
          </div>

          {requestType === 'role_application' && (
            <label className="mt-5 block text-sm text-ink">
              Role you're applying for
              <select
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value as RequestedRole)}
                className="mt-2 w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none"
              >
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
              <span className="mt-1 block text-xs text-ink-faint">Owner access cannot be requested through an application.</span>
            </label>
          )}

          <label className="mt-5 block text-sm text-ink">
            Short summary
            <input
              required
              minLength={3}
              maxLength={120}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={subjectPlaceholder(requestType)}
              className="mt-2 w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted"
            />
          </label>

          {requestType === 'bug_report' && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-ink">
                Where did it happen? <span className="text-ink-faint">(optional)</span>
                <input
                  value={whereItHappened}
                  onChange={(e) => setWhereItHappened(e.target.value)}
                  placeholder="Messages, Dashboard, mobile..."
                  className="mt-2 w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
                />
              </label>
              <label className="block text-sm text-ink">
                Severity
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none"
                >
                  <option value="low">Low — visual/minor</option>
                  <option value="normal">Normal — feature affected</option>
                  <option value="high">High — feature unusable</option>
                </select>
              </label>
            </div>
          )}

          <label className="mt-4 block text-sm text-ink">
            Details
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={detailsPlaceholder(requestType)}
              className="mt-2 w-full resize-y rounded-lg border border-border bg-canvas px-3 py-2.5 text-sm leading-6 text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted"
            />
            <span className="mt-1 block text-right text-xs text-ink-faint">{description.length}/5000</span>
          </label>

          {error && <div className="mt-4 rounded-lg border border-border bg-canvas px-4 py-3 text-sm text-ink">{error}</div>}
          {success && <div className="mt-4 rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-ink">{success}</div>}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-canvas transition-opacity disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send to Relay'}
          </button>
        </form>

        <section className="rounded-2xl border border-border bg-surface p-5 md:p-6">
          <h2 className="text-base font-semibold text-ink">Your recent requests</h2>
          <p className="mt-1 text-xs text-ink-muted">You can see when Relay staff starts or finishes something you submitted.</p>

          <div className="mt-4 space-y-3">
            {history.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-ink-muted">Nothing submitted yet.</div>
            ) : history.map((request) => (
              <div key={request.id} className="rounded-xl border border-border bg-canvas p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-ink-faint">{typeLabel(request.request_type)}</div>
                    <div className="mt-0.5 truncate text-sm font-medium text-ink">{request.subject}</div>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <div className="mt-2 text-xs text-ink-faint">{new Date(request.created_at).toLocaleString()}</div>
                {request.staff_note && <div className="mt-2 rounded-md bg-surface px-2.5 py-2 text-xs text-ink-muted">Staff note: {request.staff_note}</div>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const label = status === 'new' ? 'New' : status === 'reviewing' ? 'Reviewing' : status === 'resolved' ? 'Resolved' : 'Dismissed';
  return <span className="shrink-0 rounded-full border border-border bg-surface px-2 py-1 text-[10px] font-medium text-ink-muted">{label}</span>;
}

function routingCopy(type: RequestType) {
  if (type === 'role_application') return 'Visible only to the Relay Owner. Only the Owner can approve staff roles.';
  if (type === 'safety_report') return 'Routed to moderators, admins, and the Owner.';
  if (type === 'privacy_request') return 'Visible only to the Relay Owner.';
  return 'Routed to Relay admins and the Owner.';
}

function subjectPlaceholder(type: RequestType) {
  if (type === 'bug_report') return 'Messages fail to send on mobile';
  if (type === 'role_application') return 'Why I want to help moderate Relay';
  if (type === 'feature_request') return 'Add scheduled messages';
  if (type === 'safety_report') return 'Spam accounts joining groups';
  if (type === 'privacy_request') return 'Question about my stored data';
  return 'What I want Relay staff to know';
}

function detailsPlaceholder(type: RequestType) {
  if (type === 'bug_report') return 'What were you trying to do? What happened instead? Can you reproduce it?';
  if (type === 'role_application') return 'Tell us why you want the role, what you would help with, and any relevant experience.';
  if (type === 'feature_request') return 'What should the feature do, and why would it make Relay better?';
  if (type === 'safety_report') return 'Explain what happened and include enough context for staff to understand the concern.';
  if (type === 'privacy_request') return 'Explain what data or privacy question you need the Owner to review.';
  return 'Share your feedback in as much detail as you think is useful.';
}

function typeLabel(type: RequestType) {
  return TYPES.find((item) => item.id === type)?.title ?? type;
}
