import type { Metadata } from 'next';
import { AttendanceClient } from './attendance-client';

export const metadata: Metadata = {
  title: 'Attendance',
  description: 'See who showed up — session summaries and leadership attendance trends.',
};

export default function AttendancePage(): React.ReactElement {
  return <AttendanceClient />;
}
