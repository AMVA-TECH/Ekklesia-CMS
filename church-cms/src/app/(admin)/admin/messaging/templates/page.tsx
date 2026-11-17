import type { Metadata } from 'next';
import { TemplatesClient } from './templates-client';

export const metadata: Metadata = {
  title: 'Message templates',
  description: 'Saved messages you can reuse when texting the church.',};

export default function MessageTemplatesPage(): React.ReactElement {
  return <TemplatesClient />;
}
