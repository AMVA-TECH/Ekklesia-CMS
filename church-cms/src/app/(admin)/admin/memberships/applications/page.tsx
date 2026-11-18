import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ApplicationsClient } from './applications-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('membershipApplicationsTitle'),
    description: t('membershipApplicationsDescription'),
  };
}

export default function MembershipApplicationsPage(): React.ReactElement {
  return <ApplicationsClient />;
}
