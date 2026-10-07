import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Next preserves JSX for its own compiler; Vitest must transform TSX for coverage.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['.next/**', 'node_modules/**'],
  },
});
