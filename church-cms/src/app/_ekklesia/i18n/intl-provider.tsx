import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { HtmlLang } from './html-lang';

/**
 * Request-time intl bootstrap (reads locale cookie via next-intl).
 * Must sit under a Suspense boundary when `cacheComponents` is enabled.
 */
export async function IntlProvider({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLang />
      {children}
    </NextIntlClientProvider>
  );
}
