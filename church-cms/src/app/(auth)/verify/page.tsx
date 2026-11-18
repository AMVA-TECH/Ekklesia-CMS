import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { VerifyClient } from './verify-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('verifyTitle'),
    description: t('verifyDescription'),
  };
}

export default function VerifyPage(): React.ReactElement {
  return <VerifyClient />;
}
