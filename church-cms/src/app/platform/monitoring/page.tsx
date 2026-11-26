'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/app/_ekklesia/ui';
import { MonitoringClient } from './monitoring-client';

export default function PlatformMonitoringPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      }
    >
      <MonitoringClient />
    </Suspense>
  );
}
