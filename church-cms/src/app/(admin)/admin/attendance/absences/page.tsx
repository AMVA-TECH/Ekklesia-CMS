import type { Metadata } from 'next';
import { AbsencesClient } from './absences-client';

export const metadata: Metadata = {
  title: 'Absence notices',
  description: 'Members who told the church they would be away.',
};

export default function AbsencesPage(): React.ReactElement {
  return <AbsencesClient />;
}
