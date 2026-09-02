# Resonant-Relay

Relay is the Resonant student communication app.

The application source lives in [`relay/`](./relay). It is a static Next.js export configured for GitHub Pages at:

<https://link9060.github.io/Resonant-Relay/>

## Local development

```bash
cd relay
npm ci
npm run dev
```

Checks:

```bash
npm run lint
npm run typecheck
npm run build
```

GitHub Actions builds and deploys `relay/out` through [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) when changes reach `main`.

Launch-readiness notes and manual Supabase/provider steps are documented in [`docs/launch/`](./docs/launch).
