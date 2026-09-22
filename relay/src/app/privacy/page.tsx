import { appPageUrl } from '@/lib/config';

export default function PrivacyPage() {
  return <LegalPage title="Relay Privacy Policy" effective="September 22, 2026">
    <p>Relay is a private communication and planning app. This policy explains what Relay handles, why it is used, and the controls available to you.</p>

    <h2>Information Relay handles</h2>
    <p>Relay stores account and profile information, contacts and groups, chat messages, reactions, reports, tasks, private notes, plans, notification settings, and files you choose to upload. When you connect Google Calendar or Microsoft Calendar, Relay stores the OAuth credentials needed to maintain that connection and reads calendar data needed to show your schedule in Relay, such as calendar names, event titles, start and end times, and event links. Relay does not access your email inbox or email message contents and does not request Gmail or Microsoft Mail permissions.</p>

    <h2>How connected calendar data is used</h2>
    <p>Connected calendar data is used only to provide Relay&apos;s calendar and schedule features. Relay does not sell connected calendar data, use it for advertising, or use Google Workspace API data to develop, improve, or train generalized artificial intelligence or machine-learning models. Relay&apos;s use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.</p>

    <h2>How information is used</h2>
    <p>Information is used only to provide Relay features, secure accounts, synchronize connected calendars, deliver notifications, investigate abuse reports, and maintain the service. Relay does not sell personal information.</p>

    <h2>Service providers</h2>
    <p>Relay relies on Supabase for authentication, database, file storage, realtime updates, and backend functions; GitHub Pages for delivery of the web app; Resend for sign-in and support email delivery; and Google or Microsoft only when you choose to connect a calendar account. Resend receives the address and content needed to deliver an email. Google and Microsoft receive the OAuth and calendar requests needed for the connected feature. Those providers process data under their own terms and privacy policies.</p>

    <h2>Visibility</h2>
    <p>Messages and chat files are visible to members of that conversation. Profile information is visible where needed for contacts, requests, and shared groups. Reports are visible to the reporter and Relay&apos;s moderation systems, not the reported person. Connected calendar data is shown only in the signed-in user&apos;s Relay experience unless the user separately chooses to share information through another Relay feature.</p>

    <h2>Retention and deletion</h2>
    <p>Relay keeps data while your account exists or as needed to operate and protect the service. Unsent messages and their files are deleted from active storage. You can disconnect a connected calendar account, download your Relay data, or permanently delete your account in Profile. Limited copies may remain temporarily in provider backups or security logs.</p>

    <h2>Your choices</h2>
    <p>You can edit your profile, mute conversations, manage notifications, delete messages for yourself, unsend recent messages, disconnect external calendar accounts, export your data, and delete your Relay account. Self-service export and deletion begin when you confirm the action in <a href={appPageUrl('/profile')} className="text-ink underline underline-offset-4">Settings</a>. You can also revoke Google or Microsoft access from those providers&apos; account-security pages.</p>

    <h2>Young users and school communities</h2>
    <p>Relay should be used with any permission required by your parent, guardian, school, or local law. Do not upload highly sensitive information. Relay is not presented as an official school service unless your school separately says so.</p>

    <h2>Changes and questions</h2>
    <p>This policy may be updated as Relay changes. The effective date above will change when material revisions are published. For a privacy request, use <a href={appPageUrl('/support')} className="text-ink underline underline-offset-4">Support &amp; Feedback</a>, the account controls in Relay, or email <a href="mailto:support@resonantrelay.org" className="text-ink underline underline-offset-4">support@resonantrelay.org</a>.</p>
  </LegalPage>;
}

function LegalPage({ title, effective, children }: { title: string; effective: string; children: React.ReactNode }) { return <main className="min-h-screen bg-canvas px-5 py-10"><article className="mx-auto max-w-2xl"><a href={appPageUrl('/')} className="text-sm text-ink-muted hover:text-ink">← Relay</a><h1 className="mt-8 font-display text-3xl font-medium tracking-tight text-ink">{title}</h1><p className="mt-2 text-xs text-ink-faint">Effective {effective}</p><div className="legal-copy mt-8 space-y-5 text-sm leading-7 text-ink-muted">{children}</div><footer className="mt-10 border-t border-border pt-5 text-xs text-ink-faint"><a href={appPageUrl('/terms')} className="underline underline-offset-4">Terms of Use</a></footer></article></main>; }
