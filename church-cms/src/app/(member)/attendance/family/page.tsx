import type { Metadata } from 'next';
import { FamilyAttendanceClient } from './family-client';

export const instant = false;

export const metadata: Metadata = {
  title: 'Family attendance',
  description: "Your household's Sundays, and telling the church when you'll be away.",
};

export default function FamilyAttendancePage(): React.ReactElement {
  return <FamilyAttendanceClient />;
}
