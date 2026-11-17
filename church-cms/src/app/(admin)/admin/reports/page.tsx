import type { Metadata } from 'next';
import { ReportsClient } from './reports-client';

// Reads ?report= on the server; render per request.
export const instant = false;

export const metadata: Metadata = {
  title: 'Reports',
  description: 'Leadership, unit and finance reports.',
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>;
}): Promise<React.ReactElement> {
  const { report } = await searchParams;
  return <ReportsClient initialReportId={report ?? null} />;
}
