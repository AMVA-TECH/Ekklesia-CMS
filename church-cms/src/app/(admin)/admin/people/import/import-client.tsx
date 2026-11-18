'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
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

export function ImportClient(): React.ReactElement {
  const tp = useTranslations('AdminPeople');
  const { push } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [strategy, setStrategy] = useState<'skip_conflicts' | 'update'>('skip_conflicts');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    tp('stepUpload'),
    tp('stepCheck'),
    tp('stepReview'),
    tp('stepImport'),
  ] as const;

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
      setError(errorMessage(err, tp('importStepFailed')));
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
        title: tp('importCompleteToast'),
        message: tp('importCompleteToastMsg', {
          created: result.job.summary?.created ?? 0,
          updated: result.job.summary?.updated ?? 0,
        }),
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
        eyebrow={<Link href="/admin/people">{tp('peopleEyebrow')}</Link>}
        title={tp('importTitle')}
        lede={tp('importLede')}
      />

      <ol className="flex flex-wrap gap-2" aria-label={tp('importProgressAria')}>
        {steps.map((label, i) => (
          <li key={label}>
            <StatusPill tone={i < step ? 'success' : i === step ? 'pending' : 'neutral'}>
              {i + 1}. {label}
            </StatusPill>
          </li>
        ))}
      </ol>

      {error ? <InlineAlert>{error}</InlineAlert> : null}

      {step === 0 ? (
        <Panel title={tp('uploadPanelTitle')}>
          <div className="flex flex-col gap-4 text-sm">
            <p className="text-muted-foreground">{tp('uploadInstructions')}</p>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`}
              download="ekklesia-members-template.csv"
              className={buttonClassName({ variant: 'secondary', size: 'sm', className: 'self-start' })}
            >
              {tp('downloadTemplate')}
            </a>
            <Field label={tp('csvFile')} required>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </Field>
            <Button className="self-start" disabled={!file} loading={busy} onClick={() => void upload()}>
              {tp('uploadAndCheck')}
            </Button>
          </div>
        </Panel>
      ) : null}

      {job && step >= 1 ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label={tp('metricRows')} value={String(s.total ?? job.rowCount)} icon="file" tone="neutral" />
          <Metric label={tp('metricReady')} value={String(s.ok ?? 0)} icon="check-circle" tone="sage" />
          <Metric label={tp('metricAlreadyExist')} value={String(s.conflict ?? 0)} icon="users" tone="gold" />
          <Metric label={tp('metricErrors')} value={String(s.error ?? 0)} icon="alert-circle" tone="peach" />
        </div>
      ) : null}

      {job && step === 2 ? (
        <>
          <Panel
            title={tp('rowsNeedingAttention')}
            subtitle={
              problems.length === 0
                ? tp('everyRowReady')
                : tp('errorsSkippedConflicts')
            }
            flush
          >
            {problems.length > 0 ? (
              <TableWrap>
                <Table>
                  <THead>
                    <TR noHover>
                      <TH>{tp('colRow')}</TH>
                      <TH>{tp('colName')}</TH>
                      <TH>{tp('colStatus')}</TH>
                      <TH>{tp('colProblem')}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {problems.slice(0, 200).map((r) => (
                      <TR key={r.id}>
                        <TD className="tabular-nums">{r.rowNumber}</TD>
                        <TD>{String(r.payload.displayName ?? r.payload.name ?? tp('dash'))}</TD>
                        <TD>
                          <StatusPill tone={r.status === 'error' ? 'danger' : 'warning'}>
                            {r.status === 'error' ? tp('rowError') : tp('rowAlreadyExists')}
                          </StatusPill>
                        </TD>
                        <TD className="text-sm text-muted-foreground">
                          {(r.errorCode ?? '').replaceAll('_', ' ') || tp('dash')}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            ) : null}
          </Panel>

          <Panel title={tp('importStepTitle')}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Field label={tp('peopleWhoExist')}>
                <Select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as 'skip_conflicts' | 'update')}
                >
                  <option value="skip_conflicts">{tp('skipThem')}</option>
                  <option value="update">{tp('updateTheirDetails')}</option>
                </Select>
              </Field>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={reset} disabled={busy}>
                  {tp('startOver')}
                </Button>
                <Button loading={busy} disabled={(s.ok ?? 0) + (s.conflict ?? 0) === 0} onClick={() => void commit()}>
                  {strategy === 'update'
                    ? tp('importCountWithUpdate', {
                        ok: s.ok ?? 0,
                        conflict: s.conflict ?? 0,
                      })
                    : tp('importCount', { ok: s.ok ?? 0 })}
                </Button>
              </div>
            </div>
          </Panel>
        </>
      ) : null}

      {job && step === 3 ? (
        <Panel title={tp('importComplete')}>
          <div className="flex flex-col gap-3 text-sm">
            <p>
              {tp('importCompleteSummary', {
                created: s.created ?? 0,
                updated: s.updated ?? 0,
                skipped: s.skipped ?? 0,
              })}
            </p>
            <div className="flex gap-2">
              <Link href="/admin/people" className={buttonClassName({ size: 'sm' })}>
                {tp('viewPeople')}
              </Link>
              <Button size="sm" variant="secondary" onClick={reset}>
                {tp('importAnother')}
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
