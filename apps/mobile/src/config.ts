import { API_URL as SHARED_API_URL } from '@toposonics/shared';

export const API_URL = SHARED_API_URL;

// IMPORTANT: These must be static `process.env.EXPO_PUBLIC_*` member expressions.
// babel-preset-expo only inlines EXPO_PUBLIC_* vars for static access; reading them
// through an indirect object (e.g. globalThis.process.env[...]) resolves to `undefined`
// in a compiled release bundle and leaves the Supabase client unconfigured.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Fail fast in release builds: packages/shared silently falls back to
// http://localhost:3001 when EXPO_PUBLIC_API_URL isn't inlined, and on Android release
// (cleartext HTTP blocked) every API call then fails at runtime. Crash at startup with
// an actionable message instead of shipping a broken store build.
if (!__DEV__ && (!API_URL || API_URL.includes('localhost') || API_URL.includes('127.0.0.1'))) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not configured for this build (resolved to "' +
      (API_URL || '(empty)') +
      '"). Set EXPO_PUBLIC_API_URL in the matching profile env block in apps/mobile/eas.json ' +
      '(or in the EAS environment) so babel-preset-expo can inline it at build time.'
  );
}
