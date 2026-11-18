import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MinistryRequestsClient } from './requests-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('ministryRequestsTitle'),
    description: t('ministryRequestsDescription'),
  };
}

export default function MinistryRequestsPage(): React.ReactElement {
  return <MinistryRequestsClient />;
}
