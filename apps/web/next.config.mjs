/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@toposonics/core-audio',
    '@toposonics/core-image',
    '@toposonics/shared',
    '@toposonics/types',
    '@toposonics/ui',
  ],
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /node_modules\/tone\/build\/esm\/.*\.js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
  async headers() {
    // Allow the app to talk to Supabase and the API, plus ws for auth realtime.
    const connectSrc = ["'self'", 'https:', 'wss:'];

    // NOTE: script-src still permits 'unsafe-inline' because the Next.js App Router
    // emits inline hydration/streaming scripts. Moving to a nonce-based strict
    // script-src (via middleware) is the follow-up tracked in the PR; the headers
    // below already block framing, object embeds, base-uri hijacking, and restrict
    // where the page may connect/load resources from.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src ${connectSrc.join(' ')}`,
      "media-src 'self' blob: data:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
