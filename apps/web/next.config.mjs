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
    // NOTE: the Content-Security-Policy is set per-request (with a nonce) in
    // src/middleware.ts so script-src can be strict (no 'unsafe-inline'). The static
    // headers below don't need a nonce and stay here.
    return [
      {
        source: '/:path*',
        headers: [
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
