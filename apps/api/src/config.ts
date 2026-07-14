/**
 * Configuration and environment variables
 */

/**
 * Parse the TRUST_PROXY env var into a value @fastify accepts. Defaults to `false`
 * (don't trust client-supplied forwarding headers). Accepts `true`/`false`, a hop count
 * (e.g. `1`), or a CIDR / comma-separated list of trusted proxy addresses.
 */
function parseTrustProxy(value: string | undefined): boolean | number | string {
  if (!value) return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  const asNumber = Number(value);
  if (Number.isInteger(asNumber) && asNumber >= 0) return asNumber;
  return value;
}

const isProduction = process.env.NODE_ENV === 'production';

// Localhost defaults are for development only; production must configure CORS_ORIGINS so a
// deployed API doesn't credential-allow arbitrary localhost pages.
const developmentOrigins = ['http://localhost:3000', 'http://localhost:5173'];
const productionOrigins = [
  'https://toposonics.com',
  'https://www.toposonics.com',
  'https://app.toposonics.com',
];

const configuredOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Use configured origins when provided; otherwise fall back to environment-appropriate
// defaults (localhost only in development).
const corsOrigins =
  configuredOrigins.length > 0
    ? configuredOrigins
    : isProduction
      ? productionOrigins
      : [...developmentOrigins, ...productionOrigins];

// Canonical hostnames allowed as the target of the HTTP->HTTPS redirect (prevents the
// redirect from being pointed at an attacker-controlled Host header). Derived from the
// configured CORS/CANONICAL hosts.
const canonicalHosts = (process.env.CANONICAL_HOSTS || '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

const rateLimitAllowList = (process.env.RATE_LIMIT_ALLOW_LIST || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

const enforceHttps = process.env.ENFORCE_HTTPS !== 'false';

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  // Default to NOT trusting proxy headers: with trustProxy=true Fastify derives
  // request.ip from the client-supplied X-Forwarded-For, letting anyone spoof their IP to
  // bypass rate limiting. Behind a known proxy set TRUST_PROXY to a hop count or CIDR.
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),

  // CORS configuration
  corsOrigins,
  canonicalHosts,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Environment
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
  enforceHttps,

  // Rate limiting / DDoS protection
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    max: parseInt(process.env.RATE_LIMIT_MAX || '120', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    allowList: rateLimitAllowList,
  },

  // Monitoring configuration
  monitoring: {
    statusRoute: process.env.STATUS_ROUTE || '/status',
    maxEventLoopDelay: parseInt(process.env.MAX_EVENT_LOOP_DELAY || '1000', 10),
    maxHeapUsedBytes: parseInt(process.env.MAX_HEAP_USED_BYTES || String(200 * 1024 * 1024), 10),
    maxRssBytes: parseInt(process.env.MAX_RSS_BYTES || String(300 * 1024 * 1024), 10),
  },

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // API metadata
  apiVersion: '0.1.0',
};

export default config;
