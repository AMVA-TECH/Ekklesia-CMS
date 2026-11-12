import {
  ATTENDANCE_BAND_THRESHOLDS,
  type AttendanceBand,
  type AttendanceNudgeKind,
  type FamilyAttendanceStatus,
} from './constants';

export function bandForRate(
  presentCount: number,
  sessionsHeld: number,
): AttendanceBand {
  if (sessionsHeld <= 0) return 'insufficient_data';
  const rate = presentCount / sessionsHeld;
  if (rate >= ATTENDANCE_BAND_THRESHOLDS.consistentMinRate) return 'consistent';
  if (rate >= ATTENDANCE_BAND_THRESHOLDS.irregularMinRate) return 'irregular';
  return 'missing';
}

export function nudgeForBand(band: AttendanceBand): AttendanceNudgeKind | null {
  switch (band) {
    case 'consistent':
      return 'congratulate';
    case 'irregular':
      return 'encourage';
    case 'missing':
      return 'remind';
    default:
      return null;
  }
}

/**
 * Family day status from adult presence + absence notices (DEC-031).
 * Children are reflected separately; ≥1 adult present implies household showed.
 */
export function familyStatusForDay(input: {
  adultCount: number;
  adultsPresent: number;
  notices: number;
}): FamilyAttendanceStatus {
  if (input.adultCount <= 0) {
    return input.notices > 0 ? 'notice' : 'absent';
  }
  if (input.adultsPresent >= input.adultCount) return 'full';
  if (input.adultsPresent > 0) return 'partial';
  if (input.notices > 0) return 'notice';
  return 'absent';
}

export function defaultAttendanceRange(lookbackDays: number, now = new Date()) {
  const to = now.toISOString().slice(0, 10);
  const fromDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  fromDate.setUTCDate(fromDate.getUTCDate() - lookbackDays);
  const from = fromDate.toISOString().slice(0, 10);
  return { from, to };
}
