import type { Metadata } from 'next';
import { PositionDetailClient } from './position-detail-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'Leadership position',
  description: 'Leadership position profile, reporting, and appointments.',
};

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <PositionDetailClient positionId={id} />;
}
