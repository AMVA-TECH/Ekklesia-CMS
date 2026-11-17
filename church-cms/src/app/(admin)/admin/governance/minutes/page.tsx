import type { Metadata } from 'next';
import { MinutesClient } from './minutes-client';

export const metadata: Metadata = {
  title: 'Meeting minutes',
  description: 'Leadership and ministry meeting minutes.',
};

export default function MinutesPage(): React.ReactElement {
  return <MinutesClient />;
}
