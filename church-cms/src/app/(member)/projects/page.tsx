import type { Metadata } from 'next';
import { MemberProjectsClient } from './projects-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Church projects you can support or volunteer for.',
};

export default function MemberProjectsPage(): React.ReactElement {
  return <MemberProjectsClient />;
}
