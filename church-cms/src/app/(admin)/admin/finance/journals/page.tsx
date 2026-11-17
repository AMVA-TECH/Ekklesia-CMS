import type { Metadata } from 'next';
import { JournalsClient } from './journals-client';

export const metadata: Metadata = {
  title: 'Journals',
  description: 'General ledger journal entries.',
};

export default function JournalsPage(): React.ReactElement {
  return <JournalsClient />;
}
