import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CheckInClient } from './check-in-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('checkInTitle'),
    description: t('checkInDescription'),
  };
}

export default function CheckInPage(): React.ReactElement {
  return <CheckInClient />;
}
