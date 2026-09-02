# SECURITY DEFINER review register

**Scope:** Static review of committed migrations/source only. Live advisor output, ownership, and applied definitions require Supabase access.

| Function | Why elevated privileges may be required | Auth/authz evidence | Search path / execute | Tables or external systems | Decision / remaining check |
|---|---|---|---|---|---|
| `find_by_relay_number(text)` | Read minimal profile preview and write lookup attempts despite RLS | Checks `auth.uid()`; exact lookup and 20/10-minute limit in `0001` | `0006` restricts anon/public and grants authenticated; `0001` uses `public` search path | profiles, lookup attempts | Keep definer; add/verify fixed search path and test |
| `accept_connection_request(uuid)` | Atomically update request and insert canonical connection | Recipient and pending checks in `0001` | `0006` restricts anon/public and grants authenticated; fixed `public` path | requests, connections | Keep definer; add row lock/auth test |
| `get_or_create_direct_conversation(uuid)` | Create conversation and participants atomically | Auth, self, and connection checks in `0002` | Restricted/granted in `0006`; fixed `public` path | connections, conversations, participants | Keep definer; review block rules before beta |
| `create_group(text, uuid[])` | Create synchronized group/chat membership | Auth, name, and contact checks in `0002` | Restricted/granted in `0006`; fixed `public` path | groups, memberships, conversations | Keep definer; test membership consistency |
| `add_group_member(uuid, uuid)` | Admin-authorized synchronized membership | Admin and contact checks in `0002` | Restricted/granted in `0006`; fixed `public` path | groups, memberships, participants | Keep definer; handle missing conversation safely |
| `leave_group(uuid)` | Delete both membership representations atomically | Current `0002` lacks explicit auth/member check and admin promotion | Restricted/granted in `0006`; fixed `public` path | groups, memberships, conversations/messages | Keep definer but replace with hardened forward migration |
| `create_plan(...)` | Create recurring plan rows under RLS | Definition in `0003`; live authz needs review | Restricted/granted in `0006` | planner tables | Verify definition and tests against live schema |
| `submit_plan_response(uuid, uuid, text)` | Write response under group membership rules | Definition in `0003`; live authz needs review | Restricted/granted in `0006` | plan responses | Verify ownership/group checks |
| `delete_plan(uuid)` | Delete creator/admin-owned plan and dependent rows | Definition in `0003`; live authz needs review | Restricted/granted in `0006` | planner tables | Verify ownership/admin checks |
| `private.is_group_member(uuid)` | Avoid recursive RLS while checking membership | Stable helper uses `auth.uid()` and private schema | `search_path = ''`; execute only authenticated in `0010` | group_members | Keep definer; verify private schema exposure |
| `private.is_conversation_participant(uuid)` | Avoid recursive RLS while checking participants | Stable helper uses `auth.uid()` and private schema | `search_path = ''`; execute only authenticated in `0011` | conversation_participants | Keep definer; verify private schema exposure |
| Notification trigger functions | Write owner-scoped notifications for other users | Trigger-only, not client-callable after `0008` | `0008` revokes client execute; fixed path should be verified | notifications | Keep definer; confirm one authoritative event path |

## Review rules

- Do not convert all privileged functions to invoker merely to silence an advisor warning.
- Every definer must reject unauthenticated callers where client-callable, validate ownership/membership, use a fixed search path, and have public/anonymous execute revoked.
- Never trust user-editable metadata for authorization.
- This document does not prove migrations were applied or that live function bodies match the repository.
