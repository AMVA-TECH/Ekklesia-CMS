import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { RegisterClient } from './register-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('registerTitle'),
    description: t('registerDescription'),
  };
}

export default function RegisterPage(): React.ReactElement {
  return <RegisterClient />;
}
