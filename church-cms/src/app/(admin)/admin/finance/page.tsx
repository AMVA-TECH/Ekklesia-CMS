import type { Metadata } from 'next';
import { FinanceOverviewClient } from './finance-overview-client';

export const metadata: Metadata = {
  title: 'Finance',
  description: 'Giving overview — offerings, funds, and pledges at a glance.',
};

export default function FinancePage(): React.ReactElement {
  return <FinanceOverviewClient />;
}
