# Staff access and suite audit — 15 October 2026

## Enforced permissions

Authorization comes from the live database profile, not the saved owner preview or user-editable JWT metadata. Suspended profiles resolve to the normal-user role. Anonymous clients have no execute grant on staff/owner RPCs; users cannot directly update profile roles.

| Experience | Support requests | Inbox | Reports | Accounts | Owner tools |
| --- | --- | --- | --- | --- | --- |
| Normal user | Own submissions only | None | Own submissions only | Own profile | None |
| Moderator | Safety requests | Read | Review | None | None |
| Administrator | Bugs, features, safety, feedback | Read/reply/status | Review | Read | None |
| Owner | All types including privacy and role applications | Full | Review | Read/manage | Beta review, audit, storage, inspector, account actions |

The normal-user Support form and own report/request history remain available. Staff record queues, other users' requests, support email, audit data, and privileged mutations are inaccessible to ordinary users. The static staff route can display an access-denied message; downloading public JavaScript does not grant staff data access.

## Owner previews

The shared preview control exposes Owner, Administrator, Moderator and Normal user experiences across the suite, with an always-available return control. Preferences are scoped to the signed-in account. Only a verified owner can activate the shared switch. Lower-role previews disable staff editing, filter request types, hide owner/account sections as appropriate, and remove the staff entry for normal-user previews. A preview never changes the stored role or impersonates another account; real backend authorization remains the owner's. Database tests verify actual role enforcement separately.

## Duplication and restored capabilities

| Finding | Result |
| --- | --- |
| Ten Relay admin pages duplicated redirect markup and passed through the Orbit home page | One redirect component sends each legacy route directly to its matching staff queue; no lost queue parameter |
| Overview, Analytics and System commands all landed on the same owner overview | One Overview command; legacy URLs still resolve |
| Relay and shared shell displayed separate owner-preview banners | One shared role switch; Relay uses the same account-scoped preference |
| Orbit's generic account dump lost Relay inspector structure | Overview, Sessions, Activity, Contacts, Groups, Conversations, Reports, Storage and Owner notes sections restored with keyboard navigation |
| Account list discarded available sign-in data | Last sign-in on the collapsed card, plus email, joined date, Relay number, school, messages, contacts and report counts on review |
| Reports discarded returned reported-message context | Reported message and reporter/target context appear inside review |
| Note limits differed from server limits | Report notes limited to 500 characters and owner notes to 1000 |
| Orbit lacked direct entry to useful shared Relay tools | Notes, To-dos, Calendar and Contacts actions added to Orbit; all use existing shared data/tools |
| Orbit local display name/presence overlapped Relay's account profile | Explicitly labeled as local preferences; shared-account management links to Relay rather than creating another account editor |
| Notes/tasks/calendar/settings appear in several centers | Intentional entry points to one shared shell and canonical data, not separate stores |

Last sign-in is authentication history, not an online-presence signal. Session records are labeled separately and do not imply live presence. The owner inspector displays an explicit field allowlist instead of raw JSON or session identifiers.

## Verification

- Rollback-only live database tests exercise user/moderator/admin/owner read boundaries, owner-only mutation denials, normal-user staff-mutation denials, cross-user table isolation, anonymous execute grants, role-column escalation protection and suspended-staff access. Existing role counts were unchanged after tests.
- DOM tests cover lower-role views, read-only previews, forged preview preferences, sign-in details, inspector keyboard navigation, filter/sort/retry behavior and request-save payloads.
- React interaction test checks Orbit's staff button updates when preview changes and its shared workspace actions call the shared shell.
- Full shared-shell integration tests pass locally. CI and integrated package build validate the final pinned source.
- Signed-in browser visual verification remains pending; sign-in was previously declined.

The security advisor's generic authenticated SECURITY DEFINER notices include intentionally callable, internally role-gated RPCs. RLS-without-policy notices on internal RPC-managed tables represent default-deny access; they were not relaxed to silence the advisor.
