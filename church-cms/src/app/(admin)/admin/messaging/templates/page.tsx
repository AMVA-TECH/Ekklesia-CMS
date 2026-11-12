import type { Metadata } from 'next';
import { TemplatesClient } from './templates-client';

export const metadata: Metadata = {
  title: 'Message templates',
  description: 'Reusable SMS and notice templates.',
};

export default function MessageTemplatesPage(): React.ReactElement {
  return <TemplatesClient />;
}
