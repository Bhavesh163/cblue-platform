import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/th',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    // In production builds (CF Workers), proxy API calls to the real backend.
    // In local dev, proxy to localhost:3002.
    const isProd = process.env.NODE_ENV === 'production';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
      || (isProd ? 'https://api.cblue.co.th' : 'http://localhost:3002');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
