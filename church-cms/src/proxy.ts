import { NextResponse, type NextRequest } from 'next/server';

/**
 * Host-based routing for the Platform Operator console (ADR-0003).
 *
 * Public access is via subdomain (default `platform.<root>`), not a path on the
 * main church app. Proxy only rewrites; auth/authorisation stay in handlers.
 *
 * Local: http://platform.localhost:3000
 * Prod:  https://platform.example.com  (set NEXT_PUBLIC_ROOT_DOMAIN)
 */

const PLATFORM_SUBDOMAIN =
  process.env.NEXT_PUBLIC_PLATFORM_SUBDOMAIN?.trim() || 'platform';

function rootDomain(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (fromEnv) return fromEnv;

  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    try {
      const u = new URL(appUrl);
      // Subdomains need a real DNS label; prefer localhost over 127.0.0.1.
      const host = u.hostname === '127.0.0.1' ? 'localhost' : u.hostname;
      return u.port ? `${host}:${u.port}` : host;
    } catch {
      // fall through
    }
  }

  return 'localhost:3000';
}

function hostnameOf(request: NextRequest): string {
  const host = request.headers.get('host') ?? '';
  return host.split(':')[0]?.toLowerCase() ?? '';
}

function isPlatformHost(request: NextRequest): boolean {
  const hostname = hostnameOf(request);
  const rootHost = rootDomain().split(':')[0]?.toLowerCase() ?? 'localhost';

  if (hostname === `${PLATFORM_SUBDOMAIN}.localhost`) return true;
  if (hostname === `${PLATFORM_SUBDOMAIN}.${rootHost}`) return true;

  // Explicit full host override (e.g. ops.custom-domain.com)
  const explicit = process.env.NEXT_PUBLIC_PLATFORM_HOST?.trim()?.toLowerCase();
  if (explicit && hostname === explicit.split(':')[0]) return true;

  return false;
}

function platformOrigin(request: NextRequest): string {
  const proto = request.nextUrl.protocol || 'http:';
  const port = request.nextUrl.port;
  const root = rootDomain();
  const rootHost = root.split(':')[0] ?? 'localhost';
  const rootPort = root.includes(':') ? root.split(':')[1] : port;

  const explicit = process.env.NEXT_PUBLIC_PLATFORM_HOST?.trim();
  if (explicit) {
    const hasProtocol = explicit.startsWith('http');
    return hasProtocol ? explicit.replace(/\/$/, '') : `${proto}//${explicit}`;
  }

  const hostWithPort =
    rootHost === 'localhost' || rootHost === '127.0.0.1'
      ? `${PLATFORM_SUBDOMAIN}.localhost${rootPort ? `:${rootPort}` : ''}`
      : `${PLATFORM_SUBDOMAIN}.${rootHost}`;

  return `${proto}//${hostWithPort}`;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const onPlatform = isPlatformHost(request);

  // Main app: send /platform UI to the operator subdomain (independent entry).
  if (!onPlatform && (pathname === '/platform' || pathname.startsWith('/platform/'))) {
    const dest = new URL(pathname.replace(/^\/platform/, '') || '/', platformOrigin(request));
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest, 308);
  }

  if (!onPlatform) {
    return NextResponse.next();
  }

  // Platform host: allow auth + platform APIs + local API docs + static assets.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/v1/auth') ||
    pathname.startsWith('/api/v1/platform') ||
    pathname === '/api/docs' ||
    pathname === '/api/openapi.json'
  ) {
    return NextResponse.next();
  }

  // Block unrelated APIs on the operator host (routing hygiene, not auth).
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      {
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'API not available on platform operator host',
      },
      { status: 404 },
    );
  }

  // Rewrite clean subdomain paths → /platform/* app routes.
  if (pathname === '/platform' || pathname.startsWith('/platform/')) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? '/platform' : `/platform${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
