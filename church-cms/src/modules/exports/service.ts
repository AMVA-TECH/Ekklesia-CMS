import type { Ctx } from '@/platform/auth';
import { getDb } from '@/platform/db/client';
import { writeAudit } from '@/platform/audit';
import { toCsv } from './csv';
import { EXPORT_ROW_CAP } from './constants';
import { assertCanRunExport } from './policies';
import type { CreateExportBody } from './schemas';
import * as repo from './repository';

export type ExportResult = {
  filename: string;
  contentType: string;
  body: string;
  rowCount: number;
};

export async function createExport(
  ctx: Ctx,
  body: CreateExportBody,
): Promise<ExportResult> {
  assertCanRunExport(ctx, body.kind);
  const db = getDb();
  const stamp = new Date().toISOString().slice(0, 10);

  let headers: string[];
  let rows: unknown[][];
  let rowCount = 0;

  if (body.kind === 'people') {
    const data = await repo.exportPeopleRows(db, ctx);
    headers = [
      'person_id',
      'display_name',
      'full_name',
      'preferred_locale',
      'directory_opt_in',
      'membership_status',
      'membership_type',
      'effective_from',
    ];
    rows = data.map((r) => [
      r.personId,
      r.displayName,
      r.fullName,
      r.preferredLocale,
      r.directoryOptIn,
      r.membershipStatus,
      r.membershipType,
      r.effectiveFrom,
    ]);
    rowCount = data.length;
  } else if (body.kind === 'attendance') {
    const data = await repo.exportAttendanceRows(db, ctx, body.from!, body.to!);
    headers = ['service_date', 'total_count', 'breakdown_json'];
    rows = data.map((r) => [
      r.serviceDate,
      r.totalCount,
      JSON.stringify(r.breakdown ?? {}),
    ]);
    rowCount = data.length;
  } else {
    const data = await repo.exportFinanceOfferingRows(
      db,
      ctx,
      body.from!,
      body.to!,
    );
    headers = [
      'offering_id',
      'service_date',
      'amount_minor',
      'currency',
      'fund_id',
      'journal_id',
    ];
    rows = data.map((r) => [
      r.id,
      r.serviceDate,
      r.amountMinor,
      r.currency,
      r.fundId,
      r.journalId,
    ]);
    rowCount = data.length;
  }

  const csv = toCsv(headers, rows);
  const filename = `${body.kind}-export-${stamp}.csv`;

  await writeAudit(db, ctx, {
    action: 'exports.created',
    entityType: 'export',
    metadata: {
      kind: body.kind,
      format: body.format ?? 'csv',
      from: body.from ?? null,
      to: body.to ?? null,
      rowCount,
      capped: rowCount >= EXPORT_ROW_CAP,
      // no row payloads
    },
  });

  return {
    filename,
    contentType: 'text/csv; charset=utf-8',
    body: csv,
    rowCount,
  };
}
