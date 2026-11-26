import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { RegistrationStatusClient } from './status-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('registerChurchStatusTitle'),
    description: t('registerChurchStatusDescription'),
  };
}

export default function RegistrationStatusPage(): React.ReactElement {
  return <RegistrationStatusClient />;
}
