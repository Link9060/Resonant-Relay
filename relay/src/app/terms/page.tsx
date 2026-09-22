import { appPageUrl } from '@/lib/config';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-canvas px-5 py-10">
      <article className="mx-auto max-w-2xl">
        <a href={appPageUrl('/')} className="text-sm text-ink-muted hover:text-ink">← Relay</a>
        <h1 className="mt-8 font-display text-3xl font-medium tracking-tight text-ink">Relay Terms of Use</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-faint">
          <span>Effective September 3, 2026</span>
          <span>Last updated September 22, 2026</span>
        </div>

        <div className="legal-copy mt-8 space-y-5 text-sm leading-7 text-ink-muted">
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mt-0 text-ink">In plain language</h2>
            <p>Use Relay respectfully, protect your account, share only content you have the right to share, and report conduct that may put people or the service at risk. You keep ownership of your content and can export or delete your account from Settings.</p>
          </section>

          <p>These terms apply when you use Relay. By using Relay, you agree to use it responsibly and only if you have any permission required by your parent, guardian, school, or local law.</p>

          <h2>Your account</h2>
          <p>Keep access to your sign-in email secure and provide accurate profile information. You are responsible for activity performed through your account. Relay Numbers are for finding people you know; do not use them to spam or impersonate others.</p>

          <h2>Students and younger users</h2>
          <p>Relay is designed for school communities but is not automatically an official school service. Follow your school&apos;s rules and any permission requirements that apply to you. Do not post highly sensitive personal information. If something on Relay concerns you, use Relay&apos;s reporting tools and involve a trusted adult or appropriate school staff when needed.</p>

          <h2>Acceptable use</h2>
          <p>Do not use Relay to threaten or harass people, distribute spam or malware, invade someone&apos;s privacy, impersonate another person, upload illegal content, or interfere with the service. Do not upload files you do not have the right to share. Use Relay&apos;s reporting tools for spam, unsafe accounts, or inappropriate messages.</p>

          <h2>Your content</h2>
          <p>You keep ownership of content you submit. You give Relay the limited permission needed to store, process, display, and deliver that content as part of the service. Conversation members may retain copies of messages or files they received, even if you later delete your account.</p>

          <h2>Connected services</h2>
          <p>Google and Microsoft calendar connections are optional and read-only within Relay. Your use of those services is also governed by their terms. You can disconnect them at any time.</p>

          <h2>Moderation and access</h2>
          <p>Relay may review reports, remove content, limit features, or suspend accounts when reasonably needed to protect users, enforce these terms, or comply with law. Group admins can rename groups, promote members, and remove members, but are not Relay moderators.</p>

          <h2>Availability</h2>
          <p>Relay is provided as available and may change, pause, or experience errors. Important information should also be kept somewhere you control. To the extent allowed by law, Relay is not responsible for indirect losses caused by service interruption or use of user-submitted content.</p>

          <h2>Ending use</h2>
          <p>You may <a href={appPageUrl('/profile')} className="text-ink underline underline-offset-4">download your data or permanently delete your account from Settings</a>. These terms may be updated as Relay changes; the updated date above will change when revisions are published.</p>

          <h2>Questions and reports</h2>
          <p>Use <a href={appPageUrl('/support')} className="text-ink underline underline-offset-4">Support &amp; Feedback</a> for account, privacy, or safety questions, or email <a href="mailto:support@resonantrelay.org" className="text-ink underline underline-offset-4">support@resonantrelay.org</a>. Message-specific concerns can also be reported from the message&apos;s actions menu.</p>
        </div>

        <footer className="mt-10 border-t border-border pt-5 text-xs text-ink-faint">
          <a href={appPageUrl('/privacy')} className="underline underline-offset-4">Privacy Policy</a>
        </footer>
      </article>
    </main>
  );
}
