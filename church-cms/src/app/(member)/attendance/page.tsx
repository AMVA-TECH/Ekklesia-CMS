import type { Metadata } from 'next';
import { AttendanceClient } from './attendance-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'My attendance',
  description: 'Your Sunday and service attendance.',
};

/**
 * Member attendance view.
 *
 * Shows the attendance rate band + per-service history returned by
 * `GET /api/v1/attendance/me`. Never shows other members' attendance.
 */
export default function AttendancePage(): React.ReactElement {
  return <AttendanceClient />;
}
