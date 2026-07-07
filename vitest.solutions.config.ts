import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Solutions config: same tests, but @src points at solutions/ (all green — proves the harness works)
export default defineConfig({
  resolve: {
    alias: {
      '@src': fileURLToPath(new URL('./solutions', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
