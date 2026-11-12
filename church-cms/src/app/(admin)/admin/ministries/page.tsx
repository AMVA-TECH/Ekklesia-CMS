import type { Metadata } from 'next';
import { MinistriesClient } from './ministries-client';

export const metadata: Metadata = {
  title: 'Ministries',
  description: 'Teams, committees, and other organisational units in your church.',
};

export default function MinistriesPage(): React.ReactElement {
  return <MinistriesClient />;
}
