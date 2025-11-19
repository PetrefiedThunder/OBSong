/**
 * Configuration and environment variables
 */

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',

  // CORS configuration
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Environment
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',

  // Auth (stub configuration)
  authEnabled: process.env.AUTH_ENABLED === 'true',

  // API metadata
  apiVersion: '0.1.0',
};

export default config;
