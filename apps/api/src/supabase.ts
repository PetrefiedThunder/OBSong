import { createClient } from '@supabase/supabase-js';
import { config } from './config';

const supabaseUrl = process.env.SUPABASE_URL || config.supabaseUrl;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabaseServiceRoleKey;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Supabase URL and service role key must be provided');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
