import type { Metadata } from 'next';
import { ProjectsClient } from './projects-client';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Church projects with goals, volunteers and contributions.',
};

export default function ProjectsPage(): React.ReactElement {
  return <ProjectsClient />;
}
