import type { Metadata } from 'next';
import { ExportsClient } from './exports-client';

export const metadata: Metadata = {
  title: 'Exports',
  description: 'Download people, attendance and finance data as CSV.',
};

export default function ExportsPage(): React.ReactElement {
  return <ExportsClient />;
}
