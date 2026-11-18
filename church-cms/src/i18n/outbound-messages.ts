import en from '../../messages/en.json';
import sw from '../../messages/sw.json';
import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from './config';

type OutboundCatalog = (typeof en)['Outbound'];

const CATALOGS: Record<AppLocale, OutboundCatalog> = {
  en: en.Outbound,
  sw: sw.Outbound,
};

/** Resolve outbound copy for SMS/email system messages (server-side). */
export function outboundMessages(locale: string | null | undefined): OutboundCatalog {
  return CATALOGS[isAppLocale(locale) ? locale : DEFAULT_LOCALE];
}

/** Tiny `{name}` interpolator for outbound templates. */
export function fillOutbound(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}
