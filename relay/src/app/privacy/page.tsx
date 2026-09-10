import { appPageUrl } from '@/lib/config';

export default function PrivacyPage() {
  return <LegalPage title="Relay Privacy Policy" effective="September 8, 2026">
    <p>Relay is a communication, email viewing, calendar, and planning app. This Privacy Policy explains what information Relay accesses or stores, how that information is used, when it may be shared, how it is protected, how long it is kept, and the controls available to you.</p>

    <h2>Information Relay handles</h2>
    <p>Relay may handle account and profile information, contacts and groups, chat messages and reactions, reports, tasks and plans, notification preferences, device or browser information needed for the service, and files you choose to upload. Relay also handles information from external services only when you choose to connect those services.</p>

    <h2>Google user data Relay accesses</h2>
    <p>Connecting a Google account is optional. Relay requests only the Google permissions needed for the features you choose to use. Relay currently requests basic identity information (such as your name and email address), read-only Gmail access, and read-only Google Calendar event access.</p>
    <p>For Gmail, Relay may access inbox message identifiers and metadata such as sender, subject, date, unread status, and a short message snippet or preview so that your inbox can be displayed inside Relay. For Google Calendar, Relay may access event information such as event title, start and end time, all-day status, and links or other event metadata returned by Google so that upcoming events can be displayed inside Relay.</p>
    <p>Relay does not currently request permission to send Gmail messages, delete or modify Gmail messages, or create, edit, or delete Google Calendar events.</p>

    <h2>How Google user data is used</h2>
    <p>Google user data is used only to provide the user-facing features you requested, including connecting your Google account, showing your connected Gmail inbox, showing your Google Calendar events, and maintaining the connection so you do not have to reconnect every time you use Relay.</p>
    <p>Relay does not use Google user data for advertising, targeted advertising, retargeting, credit decisions, lending decisions, selling data, data-broker services, or creating unrelated databases. Relay does not use Google Workspace API data to develop, improve, or train generalized or non-personalized artificial intelligence or machine-learning models.</p>

    <h2>Google data storage and OAuth credentials</h2>
    <p>When you connect Google, Relay stores the OAuth access token, refresh token, granted scope information, connected account identity, and related connection metadata needed to maintain the connection. Those credentials are handled by Relay&apos;s backend services rather than intentionally exposed to other Relay users.</p>
    <p>Gmail message data and Google Calendar event data are retrieved when needed to display the connected features. Relay does not intentionally store copies of Gmail message content or Google Calendar event content in its application database as part of the current read-only integration.</p>

    <h2>Microsoft and other connected services</h2>
    <p>If you connect a Microsoft account, Relay may similarly access basic account identity, read-only Outlook mail information, and read-only calendar information needed to display those features. Relay stores the OAuth credentials and connection metadata required to maintain that connection. Connected-service data is used only to provide the feature you requested.</p>

    <h2>How Relay uses other information</h2>
    <p>Relay uses information to create and secure accounts, provide messaging and planning features, synchronize connected services, deliver notifications, support account and data controls, investigate abuse or safety reports, prevent fraud or misuse, troubleshoot errors, and maintain and improve the reliability of the service.</p>

    <h2>Sharing and service providers</h2>
    <p>Relay does not sell personal information. Relay may disclose or process information through service providers only as needed to operate the app. Relay currently relies on Supabase for services such as authentication, database storage, file storage, realtime features, and backend functions, and on the provider that hosts Relay&apos;s web application. Google and Microsoft process data when you choose to connect their services.</p>
    <p>Relay does not transfer Google user data to third parties for advertising, data brokerage, unrelated analytics, or generalized AI or machine-learning training. Information may also be disclosed when reasonably necessary to comply with law, protect users, investigate abuse, or protect the security and integrity of Relay.</p>

    <h2>Google API Services User Data Policy</h2>
    <p>Relay&apos;s use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="underline underline-offset-4" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>

    <h2>Security</h2>
    <p>Relay uses HTTPS for network communication, OAuth 2.0 authorization for connected accounts, and backend access controls intended to limit access to account credentials and user data. Relay also uses provider authentication and database security controls to separate user accounts and restrict access. No online service can guarantee absolute security, but Relay is designed to limit access to the information needed to operate each feature.</p>

    <h2>Visibility inside Relay</h2>
    <p>Messages and chat files are visible to members of the relevant conversation. Profile information is visible where needed for contacts, requests, and shared groups. Reports may be available to Relay&apos;s moderation and administrative systems as needed to investigate them. Connected Gmail and Calendar data is shown to the user who connected that account and is not shared with other Relay users as part of the normal connected-service features.</p>

    <h2>Retention and deletion</h2>
    <p>Relay keeps account and service data for as long as needed to provide the service, maintain security, comply with applicable obligations, or until you delete or disconnect the relevant data. When you disconnect a Google or Microsoft integration, Relay removes its stored connection record and OAuth credentials from active application storage and, where supported, requests revocation of the provider authorization.</p>
    <p>You can download your Relay data or permanently delete your Relay account from Profile. Account deletion removes account-associated data from active Relay systems as provided by Relay&apos;s deletion tools. Limited copies may remain temporarily in service-provider backups, security records, or logs before they are overwritten or deleted in the ordinary course of operations.</p>

    <h2>Your choices and controls</h2>
    <p>You can edit your profile, manage notifications, mute conversations, delete or unsend supported messages, disconnect external accounts, export your Relay data, and delete your Relay account. You can also revoke Relay&apos;s Google access from your Google Account permissions and revoke Microsoft access from your Microsoft account security settings.</p>

    <h2>Young users and school communities</h2>
    <p>Relay should be used only with any permission required by your parent, guardian, school, or local law. Do not upload highly sensitive information that is not needed for the service. Relay is not presented as an official school service unless a school separately states that it is.</p>

    <h2>Changes to this policy</h2>
    <p>Relay may update this policy as the product changes. If Relay materially changes how it accesses or uses Google user data or other personal information, this policy will be updated before or when those changes are made available, and the effective date above will be revised.</p>

    <h2>Questions and privacy requests</h2>
    <p>For privacy, data-access, deletion, or account questions, use Relay&apos;s Support &amp; Feedback tools after signing in. You may also use the account export, connected-account disconnect, and account deletion controls available in Profile.</p>
  </LegalPage>;
}

function LegalPage({ title, effective, children }: { title: string; effective: string; children: React.ReactNode }) {
  return <main className="min-h-screen bg-canvas px-5 py-10">
    <article className="mx-auto max-w-2xl">
      <a href={appPageUrl('/')} className="text-sm text-ink-muted hover:text-ink">← Relay</a>
      <h1 className="mt-8 font-display text-3xl font-medium tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-xs text-ink-faint">Effective {effective}</p>
      <div className="legal-copy mt-8 space-y-5 text-sm leading-7 text-ink-muted">{children}</div>
      <footer className="mt-10 border-t border-border pt-5 text-xs text-ink-faint">
        <a href={appPageUrl('/terms')} className="underline underline-offset-4">Terms of Use</a>
      </footer>
    </article>
  </main>;
}
