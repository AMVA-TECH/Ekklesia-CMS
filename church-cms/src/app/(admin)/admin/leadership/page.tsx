import type { Metadata } from 'next';
import { LeadershipClient } from './leadership-client';

export const metadata: Metadata = {
  title: 'Leadership',
  description: 'Leadership positions and reporting hierarchy for your church.',
};

export default function LeadershipPage(): React.ReactElement {
  return <LeadershipClient />;
}
