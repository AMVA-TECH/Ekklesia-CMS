import type { Metadata } from 'next';
import { EventDetailClient } from './event-detail-client';

// Client-rendered detail view keyed by a dynamic id: allow a blocking route
// instead of prerendering (Cache Components).
export const instant = false;

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
