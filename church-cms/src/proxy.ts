import { NextResponse, type NextRequest } from 'next/server';

/**
 * Platform Operator console is path-based on the main app host for now:
 *   http://localhost:3000/platform
 *
 * Subdomain entry (`platform.localhost`) redirects to the same-origin path
 * so old bookmarks still work locally. Auth stays in handlers (ADR-0003).
 */

const PLATFORM_SUBDOMAIN =
  process.env.NEXT_PUBLIC_PLATFORM_SUBDOMAIN?.trim() || 'platform';

function hostnameOf(request: NextRequest): string {
  const host = request.headers.get('host') ?? '';
  return host.split(':')[0]?.toLowerCase() ?? '';
}

function isLegacyPlatformHost(request: NextRequest): boolean {
  const hostname = hostnameOf(request);
  if (hostname === `${PLATFORM_SUBDOMAIN}.localhost`) return true;

  const explicit = process.env.NEXT_PUBLIC_PLATFORM_HOST?.trim()?.toLowerCase();
  if (explicit && hostname === explicit.split(':')[0]) return true;

  const root =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() ||
    (() => {
      try {
        return process.env.APP_URL
          ? new URL(process.env.APP_URL).hostname
          : '';
      } catch {
        return '';
      }
    })();
  const rootHost = root.split(':')[0]?.toLowerCase();
  if (
    rootHost &&
    rootHost !== 'localhost' &&
    rootHost !== '127.0.0.1' &&
    hostname === `${PLATFORM_SUBDOMAIN}.${rootHost}`
  ) {
    return true;
  }

  return false;
}

function mainAppOrigin(request: NextRequest): string {
  const proto = request.nextUrl.protocol || 'http:';
  const host = request.headers.get('host') ?? 'localhost:3000';
  // Prefer the non-subdomain host when we arrived via platform.*
  const hostname = hostnameOf(request);
  if (hostname.startsWith(`${PLATFORM_SUBDOMAIN}.`)) {
    const stripped = hostname.slice(PLATFORM_SUBDOMAIN.length + 1);
    const port = request.nextUrl.port;
    const portSuffix = port ? `:${port}` : '';
    // platform.localhost → localhost; platform.example.com → example.com
    const mainHost =
      stripped === 'localhost' || stripped === '127.0.0.1'
        ? `localhost${portSuffix || ':3000'}`
        : port
          ? `${stripped}:${port}`
          : stripped;
    return `${proto}//${mainHost}`;
  }
  return `${proto}//${host}`;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Legacy subdomain bookmarks → same-origin /platform paths.
  if (isLegacyPlatformHost(request)) {
    const dest = new URL(mainAppOrigin(request));
    if (pathname === '/' || pathname === '') {
      dest.pathname = '/platform';
    } else if (pathname.startsWith('/platform')) {
      dest.pathname = pathname;
    } else {
      dest.pathname = `/platform${pathname}`;
    }
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
