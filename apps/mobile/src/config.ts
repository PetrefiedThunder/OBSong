import { API_URL as SHARED_API_URL } from '@toposonics/shared/dist/config';

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

export const API_URL = SHARED_API_URL;
export const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
