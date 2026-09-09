import { API_URL as SHARED_API_URL } from '@toposonics/shared';

export const API_URL = SHARED_API_URL;

// IMPORTANT: These must be static `process.env.EXPO_PUBLIC_*` member expressions.
// babel-preset-expo only inlines EXPO_PUBLIC_* vars for static access; reading them
// through an indirect object (e.g. globalThis.process.env[...]) resolves to `undefined`
// in a compiled release bundle and leaves the Supabase client unconfigured.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
