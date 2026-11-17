import type { Metadata } from 'next';
import { ProjectDetailClient } from './project-detail-client';

// Client-rendered detail view keyed by a dynamic id: allow a blocking route
// instead of prerendering (Cache Components).
export const instant = false;

export const metadata: Metadata = {
  title: 'Project',
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <ProjectDetailClient projectId={id} />;
}
