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
  // API proxy is handled by app/api/v1/[...path]/route.ts (works on CF Workers)
  // Rewrites to external URLs do NOT work on Cloudflare Workers via OpenNext.
};

export default withNextIntl(nextConfig);
