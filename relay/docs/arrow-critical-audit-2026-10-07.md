# ARROW substantive bug audit — 7 October 2026

Scope: the integrated beta based on Relay `13348f2e0fd918108a8bc4b7d929abe519dfe7cf` and its four pinned centers. Production main is outside this change.

The request was for 100 significant bugs and improvements. This pass records **87 actionable findings and guardrails**, grouped by distinct user-visible failures. It does **not** claim 100 verified critical bugs. Most evidence is source review; the executable regression suites cover the highest-risk races, failure handling, routing, and attachment ownership. The signed-in live application was not exercised with a real account.

“Fixed” below means implemented in this change. The account-center Edge Function changes are **source-only, not deployed** to the shared backend. Severity: H = lost data, private-data exposure, or blocked primary flow; M = broken secondary flow or a meaningful reliability improvement.

| # | Severity | Finding / trigger | Implemented correction |
|---|---|---|---|
| 1 | H | Orbit command shortcuts call `new URL` on relative module paths without a base. | Resolve against the current origin. |
| 2 | H | Orbit quick capture throws on its relative Waypoint path. | Resolve the destination before adding capture parameters. |
| 3 | H | Orbit links escape the integrated beta when the shared shell has not initialized. | Central beta-aware resolver for launch and location controls. |
| 4 | H | Notification normalization turns `/chats/view/?id=…` into a chat whose ID is `view`. | Preserve static detail URLs. |
| 5 | M | Legacy detail conversion drops useful query parameters and fragments. | Preserve them when converting chat and plan links. |
| 6 | H | Push notifications can open unsupported dynamic chat and plan URLs on static hosting. | Convert push destinations to static detail routes. |
| 7 | H | Push clicks hijack an open Orbit or another center window. | Select a Relay-scoped window. |
| 8 | M | Push clicks focus the window before asynchronous navigation finishes. | Await navigation before focusing. |
| 9 | H | Optional visual-preference synchronization can indefinitely block opening Relay. | Bound it independently and allow account loading to finish. |
| 10 | H | Supabase network calls have no application deadline and can strand loaders and controls. | Bound client requests while preserving cancellation signals. |
| 11 | H | Relay can publish a previously loaded account after sign-out or switching accounts. | Invalidate the load, clear the view, and reload or redirect. |
| 12 | H | Rejected callback authentication promises leave “Finishing sign in” forever. | Visible recovery state. |
| 13 | H | Already-decoded OAuth error text is decoded twice; literal `%` can crash the callback. | Use the decoded search parameter directly. |
| 14 | H | The callback ignores the Relay pending destination key. | Consume both supported destination keys. |
| 15 | H | Profile-query outages send existing users through onboarding. | Treat query failure as a recoverable load error. |
| 16 | H | Beta-access RPC failure is interpreted as access denial. | Distinguish a failed check from an unapproved account. |
| 17 | H | Stored post-login destinations can loop back through login, callback, or access gates. | Same-origin center allowlist and auth-route exclusion. |
| 18 | M | Changing sign-in methods retains a previous phone verification challenge. | Clear the pending challenge and credentials. |
| 19 | H | Account controls never finish loading when no user is returned. | Visible signed-out/error state and bounded provider lookup. |
| 20 | H | An old Notes save response replaces newer typing. | Compare per-note edit revisions before applying acknowledgments. |
| 21 | H | Concurrent Notes saves reach the server out of order. | Serialize saves per note. |
| 22 | H | A single dirty-note ID loses track of changes when switching between notes. | Track all dirty notes and save their snapshots. |
| 23 | H | A failed note save offers no retry without changing the draft again. | Retain dirty state and provide explicit retry. |
| 24 | H | Note deletion races in-flight saves. | Stop new writes during deletion and await queued writes. |
| 25 | H | Deleting a note installs an old array snapshot and can erase edits to another note. | Remove it with a functional state update. |
| 26 | H | Closing a tab can discard unconfirmed Notes edits without notice. | Warn while notes remain dirty. |
| 27 | H | Note normalization crashes on malformed blocks or silently truncates oversized text. | Reject invalid/oversized content without replacing the draft. |
| 28 | H | Chats load the oldest 200 messages instead of the newest. | Descending query, then chronological display. |
| 29 | H | Older chat history has no retrieval path. | Keyset pagination with a raw-message cursor, including hidden-page handling. |
| 30 | H | An old conversation load can replace a newer route's data. | Effect cancellation and route-bound responses. |
| 31 | H | Thread state survives conversation changes. | Key the thread by conversation ID. |
| 32 | H | Conversation auth and message-query failures leave endless skeletons. | Recoverable error states. |
| 33 | H | Failed hidden-message lookup renders messages the user chose to hide. | Fail the load until visibility settings can be verified. |
| 34 | M | Replies are sent without the existing reply preview or cancellation UI. | Pass reply details and cancellation into the composer. |
| 35 | M | Incoming messages force readers away from older history. | Scroll only when already near the bottom; preserve prepended position. |
| 36 | H | Sending clears the draft before confirmation; a thrown request can lose it. | Keep and lock drafts/attachments until success. |
| 37 | H | Closely batched submit actions can start duplicate sends. | Immediate send guard independent of render timing. |
| 38 | H | Enter during IME composition sends a partial message or splits a note block. | Respect composition state. |
| 39 | H | Send-permission checks fail open or remain stuck after rejection. | Fail closed with a visible explanation. |
| 40 | H | Todo loading never finishes after auth absence or request rejection. | End loading with a recoverable error. |
| 41 | H | Rejected mutations across contacts, groups, chats, plans, tasks, notes, and schedule controls strand callers awaiting structured results. | Return structured failure results from these action boundaries. |
| 42 | H | Failed notification writes are displayed as successful read acknowledgments. | Check write results before updating local read state. |
| 43 | M | Mark-all-read includes alerts that arrive after the click. | Use the same timestamp cutoff in the database and UI. |
| 44 | H | Push disable ignores database deletion failure and can leave its busy state stuck. | Propagate deletion failure and always release controls. |
| 45 | H | Push enable/test waits indefinitely for a global service-worker-ready promise. | Wait for the correct registration's activation with failure/deadline handling. |
| 46 | H | An existing local push subscription is shown as enabled even when server persistence fails. | Verify registration before showing enabled. |
| 47 | H | Notification permission is requested after asynchronous worker registration, losing the user gesture on restrictive browsers. | Request permission immediately from the click. |
| 48 | H | Invalid calendar dates pass regex validation and roll over or fail later. | Validate actual calendar dates. |
| 49 | H | Times accepted with seconds become zero-length blocks after minute truncation. | Compare the normalized times. |
| 50 | H | Service-role attachment deletion trusts paths supplied through message metadata. | Restrict paths to the message conversation and authenticated sender; reject traversal segments. Source-only backend fix. |
| 51 | H | Account export reports success with missing sections after database failures. | Reject incomplete exports. Source-only backend fix. |
| 52 | H | Account export silently stops at the PostgREST row cap. | Page each exported collection with stable ordering. Source-only backend fix. |
| 53 | H | Account deletion only finds the first capped page of message attachments. | Page attachment ownership records. Source-only backend fix. |
| 54 | H | Account deletion continues destructive work after attachment/account lookups fail. | Check all prerequisite queries before deleting files. Source-only backend fix. |
| 55 | H | Account-center CORS omits the hosted ARROW origin and supported www origins. | Add the actual application origins. Source-only backend fix. |
| 56 | H | Overlapping Waypoint refreshes publish old planning snapshots and overwrite pending task completion. | Version refreshes and preserve pending task state. |
| 57 | H | Parallel Waypoint refresh requests rotate tokens concurrently; late refreshes can restore signed-out sessions. | Deduplicate refreshes and verify the stored refresh identity before committing. |
| 58 | H | Reapplying a capture resets completed tasks, rewrites edited notes/events, and reactivates archived items. | Ignore duplicate source keys on capture inserts. |
| 59 | H | Standalone Waypoint auto-planning calls a hosted-relative API that is absent on its origin. | Select the hosted or backend endpoint correctly. |
| 60 | M | Tasks scheduled for future dates appear in Today through the no-due-date branch. | Respect scheduled dates when selecting Today tasks. |
| 61 | H | Capture dates parsed in local time are converted to UTC, shifting the calendar day in positive-offset time zones. | Preserve local calendar components. |
| 62 | H | Accepted events with unresolved dates are silently dropped while the capture is cleared. | Stop application and explain which event needs a date. |
| 63 | H | Capture application drops legitimate tasks merely because an unrelated task has the same title. | Use source-key idempotency instead of title-wide deduplication. |
| 64 | H | Interpreting, editing, and applying captures can overlap and clear or replace newer drafts. | Lock incompatible capture operations and draft editing while pending. |
| 65 | H | Waypoint silently hides tasks/items beyond fixed request limits. | Page these collections with stable ordering. |
| 66 | H | Waypoint updates return success when no row was changed. | Require updated row representations and report missing/inaccessible items. |
| 67 | H | Atlas can republish a previous account's private graph after sign-out or switching accounts. | Account-generation checks on graph loads and error handlers. |
| 68 | H | An Atlas sync can write or display state using a changed current account. | Capture the syncing user and invalidate late results. |
| 69 | H | Atlas build dereferences a signed-out user after animation delays or remains busy on thrown requests. | Capture the user, check account generation, and release controls on failure. |
| 70 | H | RAVIN's separate auth refresh paths race token rotation and can restore a signed-out session. | Share the canonical bridge refresh, deduplicate it, and guard session writes. |
| 71 | H | A new RAVIN account inherits the previous account's active conversation IDs. | Track conversation ownership and clear IDs when ownership changes. |
| 72 | H | RAVIN leaves previous-account messages visible after an account change. | Abort work, clear visible messages, and reload the account view. |
| 73 | H | Stop RAVIN does not cancel attachment API uploads. | Share the operation's cancellation signal with uploads. |
| 74 | H | RAVIN API requests or inactive streams can indefinitely hold the composer busy. | Bound requests and stream inactivity. |
| 75 | M | Stream readers remain locked when event handlers throw. | Cancel and release readers in cleanup. |
| 76 | H | A stream ending without a done event is treated as a successful complete answer. | Require a completion event. |
| 77 | H | RAVIN clears the draft before a response and never restores it when the request fails before its first token. | Restore the draft on pre-response failure. |
| 78 | H | Switching modes or starting a new chat during a stream mixes conversation state and the ongoing response. | Block these transitions until stopped/completed. |
| 79 | H | Shared-shell refresh promises can commit old-account tokens or be reused by another account. | Bind refresh promises and writes to their refresh identity. |
| 80 | H | Shared-shell data requests can render private results after the account changes. | Verify account identity before request, after response, and after body decoding. |
| 81 | H | Private shared panels remain visible when another tab signs out or switches accounts. | Close panels and invalidate calendar work on account storage changes. |
| 82 | H | Early beta verification failure assumes a document body exists and can leave a blank page. | Wait for the body before rendering recovery content. |
| 83 | H | Beta-guard token refresh can restore a session another tab just removed. | Verify refresh identity before storage writes. |
| 84 | H | Integrated packaging overwrites reviewed Relay shell changes with an older pinned Orbit shell. | Package the reviewed Relay shell. |
| 85 | H | CI omits Relay regressions and shell tests can exercise a different file from the packaged shell. | Run Relay regressions and test the exact packaged shell. |
| 86 | H | Pull requests have no complete integrated-beta build/asset check. | Add the beta-package CI job and all center regression suites. |

| 87 | H | Leaving Notes through client-side navigation cancels the autosave timer and loses unconfirmed edits. | Account-scoped tab draft recovery, shared per-note save queues, and save flushing on unmount. |

## Validation

- Relay: lint has zero errors (27 existing warnings); TypeScript passes; 44 regression tests pass; static beta build passes.
- Orbit: TypeScript and static beta build pass; 52 Node regressions pass against the reviewed shared shell, including new route and account-isolation cases.
- Waypoint: TypeScript and static beta build pass; account/idempotency/update regression suite passes.
- RAVIN: edited JavaScript parses; token/ownership/SSE regression suite passes.
- Atlas: edited JavaScript parses; late-load and build/sign-out regression suite passes.
- CI must validate the complete pinned assembly and original remote assets before beta publication.

## Remaining high-risk work — not claimed fixed

- Account-center still deletes storage files before its final database/auth deletion; a later failure can leave a partially completed destructive operation. A durable transactional cleanup job is required.
- The account export still needs a product-wide schema inventory for Atlas, Waypoint, schedule, and RAVIN data; the existing Relay export is not a complete ARROW export.
- Chat realtime reconnects need reconciliation of missed messages, edits, and deletions. This change fixes initial history and pagination, not offline realtime catch-up.
- A rejected or lost message-write acknowledgment can still create duplicate retries. Server-side message idempotency is required; drafts and uncertainty messages now reduce accidental loss.
- Multi-device Notes conflict resolution still needs server-side revision checks; the new queue protects concurrent edits within this editor.
- Verify signed-in beta handoff, push permissions on real devices, live RLS behavior, and backend deletion/export operations with controlled accounts. No live destructive account test was performed.

These items require further implementation or live evidence. The requested 100-item critical audit is unfinished; unidentified issues are not invented to meet the count.
