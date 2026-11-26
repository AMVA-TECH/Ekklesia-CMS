'use client';

import { Suspense } from 'react';
import { use } from 'react';
import { Skeleton } from '@/app/_ekklesia/ui';
import { AuditDetailClient } from './audit-detail-client';

export default function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      }
    >
      <AuditDetailClient eventId={id} />
    </Suspense>
  );
}
