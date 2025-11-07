/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Note: i18n is not supported with Next.js App Router. Use next-intl or similar for internationalization.
  images: {
    // Allow images from an S3 bucket or CDN. Adjust domain to your actual bucket or CDN domain.
    // Note: localhost with HTTP is for development only. Update for production.
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '', // Optional: specify port if needed
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