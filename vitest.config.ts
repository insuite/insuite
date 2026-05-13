import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Minimal vitest config — just enough to test the pure-TS helpers in
 * lib/. We don't pull in React Native / Expo because nothing under
 * test imports them; if that changes, switch to vitest with
 * `@react-native/jest-preset` style transformers (or jest-expo) at
 * that point.
 *
 * `@/` is aliased to the project root so test files can import the
 * same way the app does (e.g. `import { ... } from '@/lib/...'`).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    include: ['__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
