import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CorrectionsClient } from './corrections-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta');
  return {
    title: t('attendanceCorrectionsTitle'),
    description: t('attendanceCorrectionsDescription'),
  };
}

export default function CorrectionsPage(): React.ReactElement {
  return <CorrectionsClient />;
}
