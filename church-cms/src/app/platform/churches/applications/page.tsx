'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../../console-header';
import { ApplicationsClient } from '../applications-client';

function ApplicationsPageInner() {
  return (
    <div className="flex flex-col gap-6">
      <ConsoleHeader
        area="applications"
        tab="queue"
        title="Application verification"
        description="Public onboarding queue. Open an application for guided KYC verification before approval."
      />
      <ApplicationsClient />
    </div>
  );
}

export default function ChurchApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      }
    >
      <ApplicationsPageInner />
    </Suspense>
  );
}
