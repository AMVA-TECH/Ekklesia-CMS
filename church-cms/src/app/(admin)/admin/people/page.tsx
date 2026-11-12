import type { Metadata } from 'next';
import { PeopleClient } from './people-client';

export const metadata: Metadata = {
  title: 'People',
  description: 'Everyone known to your church — members, visitors, and friends.',
};

export default function PeoplePage(): React.ReactElement {
  return <PeopleClient />;
}
