import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { JoinRequestStatusClient } from './status-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('registerStatusTitle'),
    description: t('registerStatusDescription'),
  };
}

export default function JoinRequestStatusPage(): React.ReactElement {
  return <JoinRequestStatusClient />;
}
