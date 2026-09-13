# Relay Emergency Mode — Frozen Boundary

This directory is Relay's isolated fallback client.

## Rule

Do not refactor, restyle, rename, move, or import these files into the normal Relay application during routine releases.

Normal Relay development may change freely without changing this directory. Changes here should only be made when a fallback feature is broken, a backend contract required by the fallback changes, or an explicitly tested Emergency Mode update is being released.

## Why it is separate

Emergency Mode intentionally uses plain static HTML, CSS, and JavaScript and talks directly to Relay's existing Supabase backend. It does not depend on the normal Relay app shell, dock, page components, animation system, or Next.js client runtime.

Essential scope only:
- Chats
- Contacts
- Profile editing
- Session recovery / emergency sign-in

The persistent launcher is mounted in `src/app/layout.tsx` and links directly to `public/emergency/index.html`.
