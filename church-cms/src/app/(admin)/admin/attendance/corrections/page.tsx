import type { Metadata } from 'next';
import { CorrectionsClient } from './corrections-client';

export const metadata: Metadata = {
  title: 'Attendance corrections',
  description: 'Requests to fix attendance records.',
};

export default function CorrectionsPage(): React.ReactElement {
  return <CorrectionsClient />;
}
