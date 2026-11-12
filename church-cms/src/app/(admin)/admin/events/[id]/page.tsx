import type { Metadata } from 'next';
import { EventDetailClient } from './event-detail-client';

export const metadata: Metadata = {
  title: 'Event',
};

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <EventDetailClient eventId={id} />;
}
