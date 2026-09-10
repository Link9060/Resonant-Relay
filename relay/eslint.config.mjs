import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // The admin dashboard loads remote role/stat data from Supabase on mount.
    // Keep this exception scoped to that page so unrelated effect-state issues
    // elsewhere in Relay are still caught by the React hooks lint rule.
    files: ['src/app/(app)/admin/page.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // These request-system views intentionally hydrate async Supabase data and
    // open the staff inbox in response to external realtime/session state.
    // Keep the effect-state exception limited to the new request UI.
    files: [
      'src/app/(app)/admin/requests/page.tsx',
      'src/app/(app)/support/page.tsx',
      'src/components/staff/staff-inbox-button.tsx',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // First-run onboarding intentionally resets username availability when the
    // user edits the field and memoizes the role-aware tour card list. These
    // exceptions are scoped to onboarding rather than relaxing hooks rules app-wide.
    files: ['src/app/onboarding/page.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  {
    // The Owner inspector intentionally resets local tab/data state when a
    // different account is selected. Scope the effect-state exception to this
    // component rather than weakening the rule across Relay.
    files: ['src/components/staff/owner-user-inspector.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // What’s New checks the signed-in profile's onboarding time after hydration
    // so returning users can see the current version summary once per device.
    // Keep the effect-state exception limited to this update experience.
    files: ['src/components/whats-new.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Owner Activity intentionally calculates a rolling seven-day count from
    // the current clock. Keep the purity exception scoped to this read-only view.
    files: ['src/app/(app)/admin/activity/page.tsx'],
    rules: {
      'react-hooks/purity': 'off',
    },
  },
  {
    // User-facing copy contains normal contractions/apostrophes.
    files: [
      'src/app/(app)/support/page.tsx',
      'src/components/staff/owner-user-inspector.tsx',
    ],
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
