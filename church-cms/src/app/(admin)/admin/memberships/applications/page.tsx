import type { Metadata } from 'next';
import { ApplicationsClient } from './applications-client';

export const metadata: Metadata = {
  title: 'Membership applications',
  description: 'Review and decide membership applications.',
};

export default function MembershipApplicationsPage(): React.ReactElement {
  return <ApplicationsClient />;
}
