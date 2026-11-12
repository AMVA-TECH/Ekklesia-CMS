import type { Metadata } from 'next';
import { JobsClient } from './jobs-client';

export const metadata: Metadata = {
  title: 'Send jobs',
  description: 'Queue and dispatch SMS and WhatsApp leadership blasts.',
};

export default function MessageJobsPage(): React.ReactElement {
  return <JobsClient />;
}
