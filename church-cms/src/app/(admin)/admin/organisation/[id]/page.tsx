import type { Metadata } from 'next';
import { UnitDetailClient } from './unit-detail-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'Unit',
  description: 'Organisational unit profile and settings.',
};

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <UnitDetailClient unitId={id} />;
}
