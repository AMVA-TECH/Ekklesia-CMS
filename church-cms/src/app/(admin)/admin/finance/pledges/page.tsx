import type { Metadata } from 'next';
import { PledgesClient } from './pledges-client';

export const metadata: Metadata = {
  title: 'Pledges',
  description: 'Giving promises and follow-ups.',
};

export default function PledgesPage(): React.ReactElement {
  return <PledgesClient />;
}
