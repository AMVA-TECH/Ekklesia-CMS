import type { Metadata } from 'next';
import { DelegationsClient } from './delegations-client';

export const metadata: Metadata = {
  title: 'Delegations',
  description: 'Temporary hand-over of leadership permissions.',
};

export default function DelegationsPage(): React.ReactElement {
  return <DelegationsClient />;
}
