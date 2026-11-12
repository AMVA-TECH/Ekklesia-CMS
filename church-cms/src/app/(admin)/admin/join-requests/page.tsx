import type { Metadata } from 'next';
import { JoinRequestsClient } from './join-requests-client';

export const metadata: Metadata = {
  title: 'Join requests',
  description: 'Approve or reject people who asked to join this church.',
};

export default function JoinRequestsPage(): React.ReactElement {
  return <JoinRequestsClient />;
}
