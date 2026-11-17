import type { Metadata } from 'next';
import { HouseholdDetailClient } from './household-detail-client';

// Client-rendered detail view keyed by a dynamic id: allow a blocking route
// instead of prerendering (Cache Components).
export const instant = false;

export const metadata: Metadata = {
  title: 'Household',
};

export default async function HouseholdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <HouseholdDetailClient householdId={id} />;
}
