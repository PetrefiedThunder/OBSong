/**
 * Configuration and environment variables
 */

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://toposonics.com',
  'https://www.toposonics.com',
  'https://app.toposonics.com',
];

const configuredOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
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
  trustProxy: process.env.TRUST_PROXY
    ? process.env.TRUST_PROXY === 'true'
    : enforceHttps,

  // CORS configuration
  corsOrigins: Array.from(new Set([...configuredOrigins, ...defaultAllowedOrigins])),

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

  // Auth
  authEnabled: process.env.AUTH_ENABLED === 'true',

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // API metadata
  apiVersion: '0.1.0',
};

export default config;
