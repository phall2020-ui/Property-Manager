/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Note: i18n is not supported with App Router. Use next-intl or similar for internationalization.
  images: {
    // Allow images from an S3 bucket or CDN. Adjust domain to your actual bucket or CDN domain.
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'example-bucket.s3.amazonaws.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;