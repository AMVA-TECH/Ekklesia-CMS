'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/app/_ekklesia/ui';
import { AccessClient } from './access-client';

export default function PlatformAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      }
    >
      <AccessClient />
    </Suspense>
  );
}
