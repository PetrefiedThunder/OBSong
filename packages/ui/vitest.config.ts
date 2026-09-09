import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The tsc build emits compiled copies of the tests into dist/; without this
    // exclude, a build-then-test run picks them up and fails on CJS interop.
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
