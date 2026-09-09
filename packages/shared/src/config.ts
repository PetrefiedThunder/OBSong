const configuredApiUrl =
  process.env.NEXT_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || '';

// In production the API URL must be configured explicitly. Silently falling back to
// http://localhost:3001 shipped builds pointing at localhost (empty library + console
// errors on web; cleartext-blocked failures on mobile). Warn loudly rather than throw so
// CI builds without the var set don't hard-fail, but the misconfiguration is visible.
const isProduction = process.env.NODE_ENV === 'production';

if (!configuredApiUrl && isProduction) {
  // eslint-disable-next-line no-console
  console.error(
    '[toposonics] API URL is not configured for a production build. Set NEXT_PUBLIC_API_URL ' +
      '(web) or EXPO_PUBLIC_API_URL (mobile); falling back to http://localhost:3001, which ' +
      'will not work in a deployed app.',
  );
}

export const API_URL = configuredApiUrl || 'http://localhost:3001';
