import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { VerifyRegistrationClient } from './verify-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('registerChurchVerifyTitle'),
    description: t('registerChurchVerifyDescription'),
  };
}

export default function VerifyRegistrationPage(): React.ReactElement {
  return <VerifyRegistrationClient />;
}
