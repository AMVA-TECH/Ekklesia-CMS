import type { Metadata } from 'next';
import { AnnouncementsClient } from './announcements-client';

export const metadata: Metadata = {
  title: 'Announcements',
  description: 'Notices for your church family — draft, edit, and publish.',
};

export default function AnnouncementsPage(): React.ReactElement {
  return <AnnouncementsClient />;
}
