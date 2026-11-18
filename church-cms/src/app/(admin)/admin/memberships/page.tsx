import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MembershipsClient } from './memberships-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('membershipsTitle'),
    description: t('membershipsDescription'),
  };
}

export default function MembershipsPage(): React.ReactElement {
  return <MembershipsClient />;
}
