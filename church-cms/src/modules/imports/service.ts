import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { conflict, notFound, validationFailed } from '@/platform/errors';
import { createVisitorMembership } from '@/modules/membership/repository';
import { insertPerson, updatePersonRow } from '@/modules/people/repository';
import { parseCsv } from './csv';
import { toImportJobResponse, toImportRowResponse } from './mappers';
import { assertCanRunImports } from './policies';
import {
  memberImportRowSchema,
  type CommitImportBody,
  type CreateMembersImportBody,
  type MemberImportRow,
} from './schemas';
import * as repo from './repository';

function normalizeRawRows(body: CreateMembersImportBody): Record<string, string>[] {
  if (body.csv) return parseCsv(body.csv);
  return body.rows ?? [];
}

export async function createMembersImport(ctx: Ctx, body: CreateMembersImportBody) {
  assertCanRunImports(ctx);
  const rows = normalizeRawRows(body);
  if (rows.length === 0) {
    throw validationFailed([
      { field: 'rows', code: 'empty', message: 'Import contains no data rows' },
    ]);
  }
  if (rows.length > 5000) {
    throw validationFailed([
      { field: 'rows', code: 'too_large', message: 'Maximum 5000 rows per import' },
    ]);
  }

  const db = getDb();
  const jobId = await repo.insertMembersImportJob(db, ctx, rows);
  await writeAudit(db, ctx, {
    action: 'imports.members.uploaded',
    entityType: 'import_job',
    entityId: jobId,
    metadata: { rowCount: rows.length },
  });
  const job = await repo.getJob(db, ctx, jobId);
  if (!job) throw notFound();
  return toImportJobResponse(job);
}

export async function validateImport(ctx: Ctx, jobId: string) {
  assertCanRunImports(ctx);
  const db = getDb();
  const job = await repo.getJob(db, ctx, jobId);
  if (!job) throw notFound();
  if (job.jobType !== 'members_excel') throw conflict('Unsupported import job type.');
  if (job.status !== 'uploaded' && job.status !== 'validated' && job.status !== 'previewed') {
    throw conflict(`Cannot validate import in status ${job.status}.`);
  }

  const snapshot = (job.sourceSnapshot ?? []) as Record<string, string>[];
  const results: Array<{
    rowNumber: number;
    status: string;
    payload: unknown;
    errorCode: string | null;
  }> = [];

  for (let i = 0; i < snapshot.length; i++) {
    const rowNumber = i + 1;
    const raw = snapshot[i] ?? {};
    const parsed = memberImportRowSchema.safeParse(normalizeKeys(raw));
    if (!parsed.success) {
      results.push({
        rowNumber,
        status: 'error',
        payload: raw,
        errorCode: 'validation_failed',
      });
      continue;
    }

    const data = parsed.data;
    if (!data.phoneE164 && !data.email) {
      results.push({
        rowNumber,
        status: 'error',
        payload: data,
        errorCode: 'contact_required',
      });
      continue;
    }

    let conflictPersonId: string | null = null;
    if (data.phoneE164) {
      conflictPersonId = await repo.findPersonIdByPhone(db, ctx, data.phoneE164);
    }
    if (!conflictPersonId && data.email) {
      conflictPersonId = await repo.findPersonIdByEmail(db, ctx, data.email);
    }

    if (conflictPersonId) {
      results.push({
        rowNumber,
        status: 'conflict',
        payload: { ...data, existingPersonId: conflictPersonId },
        errorCode: 'duplicate_contact',
      });
      continue;
    }

    results.push({
      rowNumber,
      status: 'ok',
      payload: data,
      errorCode: null,
    });
  }

  await repo.replaceRowResults(db, jobId, results);
  await repo.setJobStatus(db, ctx, jobId, 'validated');
  await writeAudit(db, ctx, {
    action: 'imports.members.validated',
    entityType: 'import_job',
    entityId: jobId,
    metadata: summarize(results),
  });

  const updated = await repo.getJob(db, ctx, jobId);
  if (!updated) throw notFound();
  return toImportJobResponse(updated, { summary: summarize(results) });
}

export async function previewImport(ctx: Ctx, jobId: string) {
  assertCanRunImports(ctx);
  const db = getDb();
  const job = await repo.getJob(db, ctx, jobId);
  if (!job) throw notFound();
  if (job.status !== 'validated' && job.status !== 'previewed') {
    throw conflict('Validate the import before preview.');
  }

  const rows = await repo.listRowResults(db, jobId);
  if (job.status === 'validated') {
    await repo.setJobStatus(db, ctx, jobId, 'previewed');
  }
  await writeAudit(db, ctx, {
    action: 'imports.members.previewed',
    entityType: 'import_job',
    entityId: jobId,
  });

  const updated = await repo.getJob(db, ctx, jobId);
  if (!updated) throw notFound();
  return {
    job: toImportJobResponse(updated, { summary: summarize(rows) }),
    rows: rows.map(toImportRowResponse),
  };
}

export async function commitImport(ctx: Ctx, jobId: string, body: CommitImportBody) {
  assertCanRunImports(ctx);
  const db = getDb();
  const job = await repo.getJob(db, ctx, jobId);
  if (!job) throw notFound();
  if (job.status === 'committed') throw conflict('Import already committed.');
  if (job.status !== 'previewed' && job.status !== 'validated') {
    throw conflict('Import must be validated/previewed before commit.');
  }

  const rows = await repo.listRowResults(db, jobId);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.status === 'error') {
      skipped += 1;
      continue;
    }

    if (row.status === 'conflict') {
      if (body.strategy === 'skip_conflicts') {
        skipped += 1;
        continue;
      }
      const payload = row.payload as MemberImportRow & { existingPersonId?: string };
      if (!payload.existingPersonId) {
        skipped += 1;
        continue;
      }
      await updatePersonRow(db, ctx, payload.existingPersonId, {
        displayName: payload.displayName,
        fullName: payload.fullName,
        dateOfBirth: payload.dateOfBirth,
        preferredLocale: payload.preferredLocale,
      });
      updated += 1;
      continue;
    }

    const payload = row.payload as MemberImportRow;
    const personId = await insertPerson(db, ctx, {
      displayName: payload.displayName,
      fullName: payload.fullName,
      dateOfBirth: payload.dateOfBirth,
      preferredLocale: payload.preferredLocale,
      phoneE164: payload.phoneE164,
      email: payload.email,
      directoryOptIn: false,
    });
    await createVisitorMembership(db, ctx, personId);
    created += 1;
  }

  await repo.setJobStatus(db, ctx, jobId, 'committed', true);
  await writeAudit(db, ctx, {
    action: 'imports.members.committed',
    entityType: 'import_job',
    entityId: jobId,
    metadata: { created, updated, skipped, strategy: body.strategy },
  });

  const updatedJob = await repo.getJob(db, ctx, jobId);
  if (!updatedJob) throw notFound();
  return {
    job: toImportJobResponse(updatedJob, {
      summary: { ...summarize(rows), created, updated, skipped },
    }),
  };
}

export async function getImport(ctx: Ctx, jobId: string) {
  assertCanRunImports(ctx);
  const job = await repo.getJob(getDb(), ctx, jobId);
  if (!job) throw notFound();
  const rows = await repo.listRowResults(getDb(), jobId);
  return {
    job: toImportJobResponse(job, { summary: rows.length ? summarize(rows) : undefined }),
    rows: rows.map(toImportRowResponse),
  };
}

function summarize(
  rows: Array<{ status: string }>,
): Record<string, number> {
  const summary: Record<string, number> = { total: rows.length, ok: 0, error: 0, conflict: 0 };
  for (const row of rows) {
    if (row.status in summary) summary[row.status]! += 1;
  }
  return summary;
}

/** Map common Excel header aliases to schema field names. */
function normalizeKeys(raw: Record<string, string>): Record<string, string> {
  const aliases: Record<string, string> = {
    displayname: 'displayName',
    display_name: 'displayName',
    name: 'displayName',
    fullname: 'fullName',
    full_name: 'fullName',
    phone: 'phoneE164',
    phone_e164: 'phoneE164',
    phonee164: 'phoneE164',
    email: 'email',
    dob: 'dateOfBirth',
    date_of_birth: 'dateOfBirth',
    dateofbirth: 'dateOfBirth',
    locale: 'preferredLocale',
    preferred_locale: 'preferredLocale',
    preferredlocale: 'preferredLocale',
  };
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const mapped = aliases[key.trim().toLowerCase()] ?? key.trim();
    if (value !== '') out[mapped] = value;
  }
  return out;
}
