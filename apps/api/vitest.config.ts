import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Dummy Supabase env so src/supabase.ts (which throws if unset) can be imported;
    // the client is never actually used against the network in tests (services/auth are mocked).
    env: {
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      NODE_ENV: 'test',
    },
    exclude: ['dist/**', 'node_modules/**'],
  },
});
