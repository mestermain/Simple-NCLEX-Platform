/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./nclex.db'],
    },
  },
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
