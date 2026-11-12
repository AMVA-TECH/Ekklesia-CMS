import type { Metadata } from 'next';
import { FundsClient } from './funds-client';

export const metadata: Metadata = {
  title: 'Funds',
  description: 'General, restricted, and project funds.',
};

export default function FundsPage(): React.ReactElement {
  return <FundsClient />;
}
