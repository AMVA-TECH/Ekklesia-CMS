import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { JoinRequestsClient } from './join-requests-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('joinRequestsTitle'),
    description: t('joinRequestsDescription'),
  };
}

export default function JoinRequestsPage(): React.ReactElement {
  return <JoinRequestsClient />;
}
