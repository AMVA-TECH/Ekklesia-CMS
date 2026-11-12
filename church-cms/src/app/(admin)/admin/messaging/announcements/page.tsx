import type { Metadata } from 'next';
import { AnnouncementsClient } from './announcements-client';

export const metadata: Metadata = {
  title: 'Announcements',
  description: 'Church-wide notices and updates.',
};

export default function AnnouncementsPage(): React.ReactElement {
  return <AnnouncementsClient />;
}
