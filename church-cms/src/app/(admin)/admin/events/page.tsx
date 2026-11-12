import type { Metadata } from 'next';
import { EventsClient } from './events-client';

export const metadata: Metadata = {
  title: 'Events',
  description: 'Sunday services and other gatherings — schedules, posters, and details.',
};

export default function EventsPage(): React.ReactElement {
  return <EventsClient />;
}
