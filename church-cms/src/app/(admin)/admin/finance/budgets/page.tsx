import type { Metadata } from 'next';
import { BudgetsClient } from './budgets-client';

export const metadata: Metadata = {
  title: 'Budgets',
  description: 'Monthly, quarterly and yearly budgets by account.',
};

export default function BudgetsPage(): React.ReactElement {
  return <BudgetsClient />;
}
