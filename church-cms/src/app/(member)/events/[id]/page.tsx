import type { Metadata } from 'next';
import { EventDetailClient } from './event-detail-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'Event',
  description: 'Details for a church event.',
};

type PageProps = { params: Promise<{ id: string }> };

/**
 * Member-facing single-event view.
 *
 * Shows the poster, the human details, and member-only actions
 * (register / cancel my registration) — never admin controls.
 */
export default async function MemberEventDetailPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  return <EventDetailClient eventId={id} />;
}
