'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../console-header';
import { ChurchesClient } from './churches-client';

function ChurchesPageInner() {
  return (
    <div className="flex flex-col gap-6">
      <ConsoleHeader
        area="churches"
        tab="directory"
        title="Churches"
        description="Tenants, lifecycle and audited enter-for-support."
      />
      <ChurchesClient />
    </div>
  );
}

export default function PlatformChurchesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      }
    >
      <ChurchesPageInner />
    </Suspense>
  );
}
