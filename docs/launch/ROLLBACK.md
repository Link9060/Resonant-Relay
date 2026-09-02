# Relay rollback procedure

## Code and Pages

1. Pause invitations and record the reviewed source SHA.
2. In GitHub Actions/Pages, redeploy the last known-good reviewed commit or tag.
3. Confirm the production URL, login, and a non-destructive read-only route.
4. Do not force-push, reset, clean, or rewrite history.

## Database

- Never edit a migration that may already have been applied.
- Do not run an improvised inverse migration against production.
- Stop writes or pause invitations if data integrity is at risk.
- Use the confirmed Supabase recovery/backup procedure with owner approval.
- For a forward-only corrective migration, prepare a new reviewed migration after identifying the exact applied state.

## Credentials and incidents

If a secret is exposed, rotate it at the owning provider immediately; removing it from the current branch does not revoke it. Preserve only the minimum evidence needed, avoid collecting message contents, inspect provider/Supabase/Actions logs, and document the incident and customer impact.
