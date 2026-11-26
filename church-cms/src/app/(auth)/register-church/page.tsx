import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { RegisterChurchClient } from './register-church-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('registerChurchTitle'),
    description: t('registerChurchDescription'),
  };
}

export default function RegisterChurchPage(): React.ReactElement {
  return <RegisterChurchClient />;
}
