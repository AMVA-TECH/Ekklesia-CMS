import type { importJobs, importRowResults } from '@/modules/platform/db-schema';

type Job = typeof importJobs.$inferSelect;
type Row = typeof importRowResults.$inferSelect;

export function toImportJobResponse(row: Job, extras?: { summary?: Record<string, number> }) {
  return {
    id: row.id,
    jobType: row.jobType,
    status: row.status,
    mediaAssetId: row.mediaAssetId,
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    rowCount: Array.isArray(row.sourceSnapshot) ? row.sourceSnapshot.length : 0,
    summary: extras?.summary,
  };
}

export function toImportRowResponse(row: Row) {
  return {
    id: row.id,
    rowNumber: row.rowNumber,
    status: row.status,
    payload: row.payload,
    errorCode: row.errorCode,
  };
}
