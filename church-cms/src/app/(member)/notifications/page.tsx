import type { Metadata } from 'next';
import { NotificationsClient } from './notifications-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'How your church reaches you.',
};

/**
 * Communication preferences.
 *
 * Only exposes the member-controllable channels; the backend owns which
 * message types are mandatory (safety / billing) vs. opt-in (announcements).
 */
export default function NotificationsPage(): React.ReactElement {
  return <NotificationsClient />;
}
