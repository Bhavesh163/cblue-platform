import createMiddleware from 'next-intl/middleware';
import {NextResponse} from 'next/server';
import {routing} from './i18n/routing';
import {getCanonicalCblueUrl} from './lib/canonicalHost';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: Parameters<typeof intlMiddleware>[0]) {
  const canonicalUrl = getCanonicalCblueUrl(
    request.url,
    request.nextUrl.hostname,
  );
  if (canonicalUrl) return NextResponse.redirect(canonicalUrl, 308);
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
