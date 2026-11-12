export const IMPORT_JOB_TYPES = ['members_excel'] as const;
export type ImportJobType = (typeof IMPORT_JOB_TYPES)[number];

export const IMPORT_JOB_STATUSES = [
  'uploaded',
  'validated',
  'previewed',
  'committed',
  'failed',
] as const;
export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

export const IMPORT_ROW_STATUSES = ['ok', 'error', 'conflict'] as const;
export type ImportRowStatus = (typeof IMPORT_ROW_STATUSES)[number];

export const COMMIT_STRATEGIES = ['skip_conflicts', 'update'] as const;
export type CommitStrategy = (typeof COMMIT_STRATEGIES)[number];
