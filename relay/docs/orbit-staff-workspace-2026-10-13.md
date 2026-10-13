# Orbit staff workspace — 2026-10-13

Staff control now opens a dedicated authenticated Orbit /staff/ route instead of the small shared launcher popup. The page has full-screen header/return navigation, grouped staff sidebar and a separately scrolling content area. On small screens the section navigation wraps above the content.

Operations: Support requests, Support inbox, Reports. Accounts: Accounts for admins/owners, Beta access for owners. Oversight: Overview and Audit log for owners. Owners start at Overview; other staff start at Support requests. Queue URLs survive reload. Current-page search/status filters, counts, refresh, disabled paging while loading, and stale-response protection organize queue work. Account management tools are collapsed under Manage account. Owner metrics use a wider responsive grid.

Existing RPCs, staff roles and destructive-action confirmations are retained. The interface does not expand backend permissions. Ordinary users receive no staff queues or data. No staff actions, messages, role changes, account deletion or access changes were executed during this task.

Validation: five DOM regressions cover moderator restrictions, owner grouping/filtering, slow queue races, ordinary-user denial and navigation to the dedicated route. They passed locally. JavaScript syntax and targeted lint passed with the existing arrow-shell unused-variable warning. CI validates the five-center build, including the new Orbit route. Fresh signed-in visual verification remains pending; the earlier declined browser sign-in was not requested again.
