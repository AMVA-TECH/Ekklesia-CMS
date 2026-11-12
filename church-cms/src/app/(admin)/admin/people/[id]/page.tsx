import type { Metadata } from 'next';
import { PersonDetailClient } from './person-detail-client';

export const metadata: Metadata = {
  title: 'Person',
};

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <PersonDetailClient personId={id} />;
}
