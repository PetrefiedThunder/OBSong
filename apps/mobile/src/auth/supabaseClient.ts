import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import { secureStorage } from './secureStorage';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase is not configured: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
      'must be set at build time. In development set them in apps/mobile/.env; for EAS builds ' +
      'define them under the matching profile in eas.json (see the "env" blocks).',
  );
}

/**
 * Supabase client configured with secure storage
 * JWTs and session data are encrypted using the device's secure keychain/keystore
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: secureStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
