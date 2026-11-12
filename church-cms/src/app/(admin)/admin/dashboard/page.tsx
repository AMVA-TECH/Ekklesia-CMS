import type { Metadata } from 'next';
import { DashboardClient } from './dashboard-client';

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'Snapshot of your church — people, ministries, giving and upcoming services.',
};

/**
 * Admin landing page. All interactive loading happens inside the client
 * component so we can call `apiFetch` with the user's dev or real session
 * and render skeletons while data arrives.
 */
export default function DashboardPage(): React.ReactElement {
  return <DashboardClient />;
}
