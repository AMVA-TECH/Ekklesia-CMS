import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RolesWorkspaceClient } from './roles-workspace-client';
import { Skeleton, PageHeader } from '@/app/_ekklesia/ui';

export const metadata: Metadata = {
  title: 'Roles & permissions',
  description: 'Manage church roles, permissions, and access assignments.',
};

export default function RolesPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <PageHeader title="Roles & permissions" lede="" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <RolesWorkspaceClient />
    </Suspense>
  );
}
