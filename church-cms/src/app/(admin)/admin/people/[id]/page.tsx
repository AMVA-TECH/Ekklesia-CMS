import type { Metadata } from 'next';
import { PersonDetailClient } from './person-detail-client';

// Client-rendered detail view keyed by a dynamic id: allow a blocking route
// instead of prerendering (Cache Components).
export const instant = false;

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
