import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ActivateChurchClient } from './activate-church-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('activateChurchTitle'),
    description: t('activateChurchDescription'),
  };
}

export default function ActivateChurchPage(): React.ReactElement {
  return <ActivateChurchClient />;
}
