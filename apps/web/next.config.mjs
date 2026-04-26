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
};

export default nextConfig;
