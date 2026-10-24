/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    outputFileTracingIncludes: {
      '/**': ['./nclex.db'],
    },
  },
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
