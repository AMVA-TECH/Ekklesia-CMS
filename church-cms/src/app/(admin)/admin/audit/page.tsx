import type { Metadata } from 'next';
import { AuditClient } from './audit-client';

export const metadata: Metadata = {
  title: 'Audit log',
  description: 'Who did what, and when, in this church.',
};

export default function AuditPage(): React.ReactElement {
  return <AuditClient />;
}
