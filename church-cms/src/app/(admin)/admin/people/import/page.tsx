import type { Metadata } from 'next';
import { ImportClient } from './import-client';

export const metadata: Metadata = {
  title: 'Import members',
  description: 'Bulk-add members from a spreadsheet.',
};

export default function ImportMembersPage(): React.ReactElement {
  return <ImportClient />;
}
