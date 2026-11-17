import type { Metadata } from 'next';
import { ApprovalsClient } from './approvals-client';

export const metadata: Metadata = {
  title: 'Approvals',
  description: 'Dual-control approvals for expenses and announcements.',
};

export default function ApprovalsPage(): React.ReactElement {
  return <ApprovalsClient />;
}
