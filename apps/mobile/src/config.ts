const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

export const API_URL = env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
export const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
