import { Suspense } from 'react';
import { AuditClient } from './audit-client';

export default function PlatformAuditPage() {
  return (
    <Suspense fallback={<p className="platform-muted">Loading audit…</p>}>
      <AuditClient />
    </Suspense>
  );
}
