/** Admin-local attendance session shape from `/api/v1/.../attendance-sessions`. */
export interface AttendanceSession {
  id: string;
  eventId: string;
  mode: string;
  status: string;
  recordedAt: string;
  finalizedAt: string | null;
  summary: {
    menCount: number;
    womenCount: number;
    childrenCount: number;
    visitorsCount: number;
    totalCount: number;
  } | null;
  recordCount?: number;
}

/** Row from `GET /api/v1/attendance-sessions/:id/records`. */
export interface AttendanceRecord {
  id: string;
  personId: string | null;
  presence: string;
  source: string;
  checkedInAt: string;
  checkInName: string | null;
  checkInPhone: string | null;
}

export const ATTENDANCE_MODE_OPTIONS = [
  {
    value: 'roll_call',
    label: 'Roll call',
    hint: 'Mark people present by name.',
  },
  {
    value: 'headcount',
    label: 'Headcount',
    hint: 'Record men, women, children, and visitors totals.',
  },
  {
    value: 'qr_mixed',
    label: 'QR + roll call',
    hint: 'Person records now; QR tokens can be issued later.',
  },
] as const;

export type AttendanceModeOption = (typeof ATTENDANCE_MODE_OPTIONS)[number]['value'];
