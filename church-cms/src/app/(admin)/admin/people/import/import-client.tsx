'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '@/app/_ekklesia/session';
import {
  Button,
  buttonClassName,
  Field,
  Metric,
  PageHeader,
  Panel,
  Select,
  StatusPill,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/app/_ekklesia/ui';
import { InlineAlert } from '../../../_components/kit';
import { errorMessage } from '../../../_lib/errors';
import { t, tk } from '@/app/_ekklesia/i18n/core';

interface ImportJob {
  id: string;
  status: 'uploaded' | 'validated' | 'previewed' | 'committed' | 'failed';
  rowCount: number;
  summary?: Record<string, number>;
}
interface ImportRow {
  id: string;
  rowNumber: number;
  status: 'ok' | 'error' | 'conflict';
  payload: Record<string, unknown>;
  errorCode: string | null;
}

const TEMPLATE =
  'displayName,fullName,phone,email,dob,locale\n' +
  'Amani,Amani Juma,+255712345678,amani@example.com,1990-04-12,sw\n';

const STEPS = [tk('Upload'), tk('Check'), tk('Review'), tk('Import')] as const;

export function ImportClient(): React.ReactElement {
  const { push } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [strategy, setStrategy] = useState<'skip_conflicts' | 'update'>('skip_conflicts');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = !job
    ? 0
    : job.status === 'uploaded'
      ? 1
      : job.status === 'committed'
        ? 3
        : 2;

  const guard = async (fn: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err, t('The import step failed.')));
    } finally {
      setBusy(false);
    }
  };

  const upload = (): Promise<void> =>
    guard(async () => {
      if (!file) return;
      const csv = await file.text();
      const created = await apiFetch<ImportJob>('/api/v1/imports/members', {
        method: 'POST',
        json: { csv },
      });
      // Validate and preview straight away: both are read-only checks.
      const validated = await apiFetch<ImportJob>(`/api/v1/imports/${created.id}/validate`, {
        method: 'POST',
      });
      setJob(validated);
      const preview = await apiFetch<{ job: ImportJob; rows: ImportRow[] }>(
        `/api/v1/imports/${created.id}/preview`,
      );
      setJob(preview.job);
      setRows(preview.rows);
    });

  const commit = (): Promise<void> =>
    guard(async () => {
      if (!job) return;
      const result = await apiFetch<{ job: ImportJob }>(`/api/v1/imports/${job.id}/commit`, {
        method: 'POST',
        json: { strategy },
      });
      setJob(result.job);
      push({
        tone: 'success',
        title: t('Import complete'),
        message: t('{0} added, {1} updated.', result.job.summary?.created ?? 0, result.job.summary?.updated ?? 0),
      });
    });

  const reset = (): void => {
    setFile(null);
    setJob(null);
    setRows([]);
    setError(null);
  };

  const s = job?.summary ?? {};
  const problems = rows.filter((r) => r.status !== 'ok');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/admin/people">{t('People')}</Link>}
        title={t('Import members')}
        lede={t('Add many people at once from Excel. Nothing is saved until you confirm the final step.')}
      />

      <ol className="flex flex-wrap gap-2" aria-label={t('Import progress')}>
        {STEPS.map((label, i) => (
          <li key={label}>
            <StatusPill tone={i < step ? 'success' : i === step ? 'pending' : 'neutral'}>
              {i + 1}. {t(label)}
            </StatusPill>
          </li>
        ))}
      </ol>

      {error ? <InlineAlert>{error}</InlineAlert> : null}

      {step === 0 ? (
        <Panel title={t('1. Upload a CSV file')}>
          <div className="flex flex-col gap-4 text-sm">
            <p className="text-muted-foreground">
              {t('In Excel choose')} <strong>{t('File → Save As → CSV (UTF-8)')}</strong>{t('. Use one row per person with these column headers:')} <code>displayName</code> {t('(required),')} <code>fullName</code>,{' '}
              <code>phone</code> {t('(international format, e.g. +255712345678),')} <code>email</code>,{' '}
              <code>dob</code> {t('(YYYY-MM-DD) and')} <code>locale</code> {t('(sw or en). Up to 5,000 rows.')}
            </p>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`}
              download="ekklesia-members-template.csv"
              className={buttonClassName({ variant: 'secondary', size: 'sm', className: 'self-start' })}
            >
              {t('Download template')}
            </a>
            <Field label={t('CSV file')} required>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </Field>
            <Button className="self-start" disabled={!file} loading={busy} onClick={() => void upload()}>
              {t('Upload and check')}
            </Button>
          </div>
        </Panel>
      ) : null}

      {job && step >= 1 ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label={t('Rows')} value={String(s.total ?? job.rowCount)} icon="file" tone="neutral" />
          <Metric label={t('Ready')} value={String(s.ok ?? 0)} icon="check-circle" tone="sage" />
          <Metric label={t('Already exist')} value={String(s.conflict ?? 0)} icon="users" tone="gold" />
          <Metric label={t('Errors')} value={String(s.error ?? 0)} icon="alert-circle" tone="peach" />
        </div>
      ) : null}

      {job && step === 2 ? (
        <>
          <Panel
            title={t('Rows needing attention')}
            subtitle={
              problems.length === 0
                ? t('Every row is ready to import.')
                : t('Errors are skipped. Conflicts match an existing person by phone or email.')
            }
            flush
          >
            {problems.length > 0 ? (
              <TableWrap>
                <Table>
                  <THead>
                    <TR noHover>
                      <TH>{t('Row')}</TH>
                      <TH>{t('Name')}</TH>
                      <TH>{t('Status')}</TH>
                      <TH>{t('Problem')}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {problems.slice(0, 200).map((r) => (
                      <TR key={r.id}>
                        <TD className="tabular-nums">{r.rowNumber}</TD>
                        <TD>{String(r.payload.displayName ?? r.payload.name ?? '—')}</TD>
                        <TD>
                          <StatusPill tone={r.status === 'error' ? 'danger' : 'warning'}>
                            {r.status === 'error' ? t('Error') : t('Already exists')}
                          </StatusPill>
                        </TD>
                        <TD className="text-sm text-muted-foreground">
                          {(r.errorCode ?? '').replaceAll('_', ' ') || '—'}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            ) : null}
          </Panel>

          <Panel title={t('4. Import')}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Field label={t('People who already exist')}>
                <Select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as 'skip_conflicts' | 'update')}
                >
                  <option value="skip_conflicts">{t('Skip them')}</option>
                  <option value="update">{t('Update their details')}</option>
                </Select>
              </Field>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={reset} disabled={busy}>
                  {t('Start over')}
                </Button>
                <Button loading={busy} disabled={(s.ok ?? 0) + (s.conflict ?? 0) === 0} onClick={() => void commit()}>
                  {t('Import')} {s.ok ?? 0} {strategy === 'update' ? t('+ update {0}', s.conflict ?? 0) : ''}
                </Button>
              </div>
            </div>
          </Panel>
        </>
      ) : null}

      {job && step === 3 ? (
        <Panel title={t('Import complete')}>
          <div className="flex flex-col gap-3 text-sm">
            <p>
              {t('Added')} <strong>{s.created ?? 0}</strong>{t(', updated')} <strong>{s.updated ?? 0}</strong>{t(', skipped')}{' '}
              <strong>{s.skipped ?? 0}</strong>.
            </p>
            <div className="flex gap-2">
              <Link href="/admin/people" className={buttonClassName({ size: 'sm' })}>
                {t('View people')}
              </Link>
              <Button size="sm" variant="secondary" onClick={reset}>
                {t('Import another file')}
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
