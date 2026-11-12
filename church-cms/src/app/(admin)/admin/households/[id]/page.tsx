import type { Metadata } from 'next';
import { HouseholdDetailClient } from './household-detail-client';

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
