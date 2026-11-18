import type { Metadata } from 'next';
import { MinistryRequestsClient } from './requests-client';

export const metadata: Metadata = {
  title: 'Ministry join requests',
  description: 'Members asking to join a ministry.',
};

export default function MinistryRequestsPage(): React.ReactElement {
  return <MinistryRequestsClient />;
}
