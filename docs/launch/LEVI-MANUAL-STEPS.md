# Levi manual launch steps

This checklist is intentionally secret-free. Do not paste keys, tokens, user credentials, production logs, or message contents into GitHub or chat.

## 1. Protect the database first

1. **Where:** Supabase dashboard → Database → Backups (or the project’s configured recovery/export process).
2. **Action:** Confirm a recent recovery point exists and record its timestamp. Do not run destructive cleanup or edit applied migrations.
3. **Expected result:** A restorable backup/recovery option is confirmed before applying any launch migration.
4. **Stop/rollback:** Stop if recovery cannot be confirmed. Contact the project owner/Supabase support rather than improvising.

## 2. Apply migrations in order

1. **Where:** Supabase SQL Editor or the approved Supabase CLI workflow.
2. **Files:** Run `relay/supabase/migrations/0001_foundation.sql` through `0011_fix_conversation_participants_rls.sql` in order, then any newer launch migrations from this branch in filename order.
3. **Expected result:** Each migration succeeds once; record the applied filename and timestamp.
4. **Stop/rollback:** Stop on the first SQL error. Do not rerun partially understood statements or edit historical migration files. Use a reviewed corrective migration or restore procedure.
5. **Important:** A committed SQL file is only “prepared” until this step succeeds against the intended project.

## 3. Run database security/regression checks

1. **Where:** Disposable local/test Supabase database preferred; otherwise the project’s approved staging database.
2. **Action:** Run the launch SQL/RLS tests included in the repository. Use test accounts only and wrap fixtures in a transaction or clean disposable database.
3. **Expected result:** Anonymous execution is denied; unrelated users cannot read or mutate requests; request state transitions, acceptance idempotency, group leave synchronization, admin promotion, message authorization, and limits pass.
4. **Stop/rollback:** Do not test destructive behavior against production data. Stop if expected policy/function signatures differ from the migration assumptions.

## 4. Deploy trusted Supabase functions

1. **Where:** Supabase CLI/dashboard Edge Functions deployment.
2. **Files:** `relay/supabase/functions/` and the function-specific deployment documentation.
3. **Secrets:** Configure service-role, OAuth, push, email, and other secrets only in Supabase/hosting secret settings under their exact documented names. Never commit them.
4. **Expected result:** Functions deploy successfully, require a valid user JWT where documented, and do not log tokens.
5. **Stop/rollback:** Disable the function or restore the previous function version if authorization or deletion tests fail.

## 5. Configure Google OAuth and optional integrations

1. **Where:** Supabase → Authentication → Providers → Google, and Google Cloud Console → OAuth client.
2. **Action:** Confirm the Supabase callback URL is an authorized redirect URI. Confirm sign-in requests only `openid email profile`; Calendar/Gmail scopes are incremental and read-only.
3. **Expected result:** New and returning users can complete the intended login flow at the production Pages/custom-domain origin.
4. **Stop/rollback:** Remove/disable optional Calendar/Gmail connect controls if trusted token storage/refresh is not deployed. Do not expose client secrets or refresh tokens.

## 6. Configure email magic links, if enabled

1. **Where:** Supabase Auth URL configuration and the configured email provider.
2. **Action:** Confirm production site URL and `/Resonant-Relay/` callback/redirect paths, sender identity, rate limits, and delivery.
3. **Expected result:** A test email reaches a test account and returns to the production app without localhost URLs.
4. **Stop/rollback:** Disable email login for beta if provider configuration is incomplete; do not claim it is configured from source alone.

## 7. Review password protection

1. **Where:** Supabase Auth security settings.
2. **Action:** If Relay has no password login, document leaked-password protection as deferred/low priority. If password login exists, enable leaked-password protection and test signup/password reset.
3. **Expected result:** The setting matches the actual authentication methods.
4. **Stop/rollback:** Do not enable a flow that is not implemented and tested.

## 8. Confirm Realtime and push

1. **Where:** Supabase Database → Replication and browser device settings.
2. **Action:** Confirm `messages` is in `supabase_realtime`, notification ownership policies are active, and push configuration is complete if enabled.
3. **Expected result:** Authorized users receive only their conversation/notification events; missing push configuration does not break the app.
4. **Stop/rollback:** Turn off push UI/configuration if private keys, service worker base paths, or trusted sending are not correctly deployed.

## 9. Confirm Pages deployment

1. **Where:** GitHub repository Settings → Pages and Actions.
2. **Action:** Confirm Pages uses GitHub Actions and that `.github/workflows/deploy-pages.yml` succeeds from a reviewed source SHA.
3. **Expected result:** `https://link9060.github.io/Resonant-Relay/` loads the reviewed build and deep-link fallback behavior is confirmed.
4. **Stop/rollback:** Redeploy the last known-good source SHA; do not overwrite history.

## 10. Run the two-account beta test

1. **Where:** Production URL, using two separate test accounts and two device/browser types.
2. **Action:** Sign in → profile/Relay Number → lookup → request → accept/decline/cancel → direct chat → send/receive → refresh/reopen → remove/block → sign out/sign back in.
3. **Expected result:** Each account sees only authorized data; messages persist; no deep-link 404 occurs; blocked users cannot continue direct-contact actions.
4. **Stop/rollback:** Pause invitations immediately for data leakage, unauthorized mutation, message loss, broken deletion, or repeated crashes.

## 11. Apply privacy and deletion owner decisions

1. **Where:** Production app, Supabase settings, and the approved support channel.
2. **Action:** Replace `[RELAY SUPPORT EMAIL NEEDED]` with a real monitored address, review plain-language beta policy with appropriate parent/guardian/legal stakeholders, and deploy the trusted account deletion path.
3. **Expected result:** Users can understand stored data and request deletion; deletion operates only on the authenticated account and removes app-owned data/tokens safely.
4. **Stop/rollback:** Do not promote beyond closed testing without a reliable deletion request process at minimum.

## 12. Rollback

1. **Code:** Use GitHub Pages/Actions to redeploy the prior reviewed commit or tag. Never force-push or rewrite history.
2. **Database:** Do not blindly reverse applied migrations. Follow the migration-specific rollback notes and restore from the confirmed recovery point only with owner approval.
3. **Incident:** Pause invitations, preserve evidence without collecting message contents unnecessarily, check Supabase/Auth/Pages logs, rotate any exposed credential through its provider, and document the incident.
