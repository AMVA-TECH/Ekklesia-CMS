import { NextResponse } from 'next/server';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isAppLocale,
  type AppLocale,
} from '@/i18n/config';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Persist UI locale cookie. Optional body `{ persistProfile: true }` is reserved
 * for Phase 1+ session wiring; Phase 0 only sets the cookie.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let locale: AppLocale = DEFAULT_LOCALE;

  try {
    const body = (await request.json()) as { locale?: unknown };
    if (isAppLocale(body.locale)) {
      locale = body.locale;
    } else {
      return NextResponse.json(
        { error: 'locale must be "en" or "sw"' },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const response = NextResponse.json({ locale });
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'lax',
    httpOnly: false,
  });
  return response;
}
