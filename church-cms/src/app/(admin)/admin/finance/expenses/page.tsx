import type { Metadata } from 'next';
import { ExpensesClient } from './expenses-client';

export const metadata: Metadata = {
  title: 'Expenses',
  description: 'Disbursement requests with dual-control approval.',
};

export default function ExpensesPage(): React.ReactElement {
  return <ExpensesClient />;
}
