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
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
