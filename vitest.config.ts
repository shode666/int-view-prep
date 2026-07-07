import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Default config: tests run against YOUR implementations in src/
export default defineConfig({
  resolve: {
    alias: {
      '@src': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
