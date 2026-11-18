import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { getRequestConfig } from 'next-intl/server';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  parseAppLocale,
  type AppLocale,
} from './config';

async function loadMessages(locale: AppLocale) {
  switch (locale) {
    case 'en':
      return (await import('../../messages/en.json')).default;
    case 'sw':
      return (await import('../../messages/sw.json')).default;
    default: {
      const _exhaustive: never = locale;
      return _exhaustive;
    }
  }
}

export default getRequestConfig(async () => {
  // Cookie locale must be request-time — Cache Components otherwise can SSR
  // one catalog and hydrate another (EN vs SW mismatch).
  await connection();
  const store = await cookies();
  const locale = parseAppLocale(store.get(LOCALE_COOKIE)?.value, DEFAULT_LOCALE);

  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: 'Africa/Dar_es_Salaam',
  };
});
