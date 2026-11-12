import type { Metadata } from 'next';
import { MemberEventsClient } from './events-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'Events',
  description: 'Browse church events and manage your registrations.',
};

/**
 * Member events list.
 *
 * Shows upcoming church events in a phone-friendly list with poster thumbnails
 * where present. Past events (anything before today) are hidden by default —
 * members mostly care about what is coming up.
 */
export default function MemberEventsPage(): React.ReactElement {
  return <MemberEventsClient />;
}
