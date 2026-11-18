'use client';

import { useCallback, useMemo, useState } from 'react';
import { apiFetch, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Button,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  useToast,
} from '@/app/_ekklesia/ui';
import type { OrganisationalUnit } from '../../_lib/api-types';
import { FormDialog, InlineAlert, ListState } from '../../_components/kit';
import { errorMessage } from '../../_lib/errors';
import { formatDateTime, titleCase } from '../../_lib/format';
import { useApiList } from '../../_lib/use-api-list';
import { ReportData } from './report-data';
import { useTranslations } from 'next-intl';

interface CatalogueEntry {
  id: string;
  name: string;
  audience: string;
}
interface ReportResult {
  reportId: string;
  name: string;
  generatedAt: string;
  data: unknown;
}
interface SavedReport {
  id: string;
  name: string;
  reportId: string;
  filters: { from?: string; to?: string; unitId?: string };
}
interface Filters {
  from: string;
  to: string;
  unitId: string;
}

function audienceLabel(tr: ReturnType<typeof useTranslations<'AdminReports'>>, audience: string): string {
  switch (audience) {
    case 'senior_pastor_pastoral':
      return tr('catPastoral');
    case 'church_administrator_pogs':
      return tr('catAdmin');
    case 'unit_leaders':
      return tr('catUnits');
    case 'finance':
      return tr('catFinance');
    default:
      return titleCase(audience);
  }
}

const needsUnit = (id: string): boolean => /^R-UNIT-0[134]$/.test(id);

export function ReportsClient({
  initialReportId,
}: {
  initialReportId: string | null;
}): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tr = useTranslations('AdminReports');
  const { push } = useToast();
  const catalogue = useApiList<CatalogueEntry>('/api/v1/reports');
  const saved = useApiList<SavedReport>('/api/v1/saved-reports');
  const units = useApiList<OrganisationalUnit>('/api/v1/organisational-units?limit=100');
  const [selected, setSelected] = useState<string | null>(initialReportId);
  const [filters, setFilters] = useState<Filters>({ from: '', to: '', unitId: '' });
  const [result, setResult] = useState<ReportResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, CatalogueEntry[]>();
    for (const r of catalogue.items) map.set(r.audience, [...(map.get(r.audience) ?? []), r]);
    return Array.from(map.entries());
  }, [catalogue.items]);
  const current = catalogue.items.find((r) => r.id === selected) ?? null;

  const execute = async (fetcher: () => Promise<ReportResult>): Promise<void> => {
    setRunning(true);
    setRunError(null);
    try {
      setResult(await fetcher());
    } catch (err) {
      setResult(null);
      setRunError(errorMessage(err, tr('couldNotRun')));
    } finally {
      setRunning(false);
    }
  };

  // A deep link (?report=ID) runs straight away when no unit is required.
  const [autoRan, setAutoRan] = useState(false);
  const autoRun = useCallback(async (): Promise<void> => {
    if (autoRan || !initialReportId || needsUnit(initialReportId)) return;
    setAutoRan(true);
    await execute(() => apiFetch<ReportResult>(`/api/v1/reports/${initialReportId}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReportId]);
  useLoadEffect(autoRun);

  const runSelected = (): void => {
    if (!selected) return;
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.unitId) params.set('unitId', filters.unitId);
    void execute(() =>
      apiFetch<ReportResult>(`/api/v1/reports/${selected}?${params.toString()}`),
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('reports')}
        lede={t('reportsLede')}
      />

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="flex flex-col gap-6">
          <Panel title={tr('catalogue')} flush>
            <ListState
              loading={catalogue.loading}
              error={catalogue.error}
              forbidden={catalogue.forbidden}
              isEmpty={catalogue.items.length === 0}
              onRetry={() => void catalogue.reload()}
              empty={{ icon: 'chart', title: tr('noReports') }}
            >
              <nav aria-label={tr('reportsNav')} className="flex flex-col gap-3 p-3">
                {groups.map(([audience, rows]) => (
                  <div key={audience}>
                    <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {audienceLabel(tr, audience)}
                    </p>
                    <ul>
                      {rows.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            aria-current={selected === r.id ? 'true' : undefined}
                            className={
                              'w-full rounded-md px-2 py-2.5 text-left text-sm focus-ring ' +
                              (selected === r.id
                                ? 'bg-brand-gold-tint font-medium text-foreground'
                                : 'hover:bg-surface-muted')
                            }
                            onClick={() => {
                              setSelected(r.id);
                              setResult(null);
                              setRunError(null);
                            }}
                          >
                            {r.name}
                            <span className="ml-1 text-xs text-muted-foreground">{r.id}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </ListState>
          </Panel>

          <Panel title={tr('savedReports')} flush>
            <ListState
              loading={saved.loading}
              error={saved.error}
              forbidden={saved.forbidden}
              isEmpty={saved.items.length === 0}
              onRetry={() => void saved.reload()}
              empty={{ icon: 'bookmark', title: tr('nothingSaved') }}
            >
              <ul className="flex flex-col p-2">
                {saved.items.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full rounded-md px-2 py-2.5 text-left text-sm hover:bg-surface-muted focus-ring"
                      onClick={() => {
                        setSelected(s.reportId);
                        setFilters({
                          from: s.filters?.from ?? '',
                          to: s.filters?.to ?? '',
                          unitId: s.filters?.unitId ?? '',
                        });
                        void execute(async () => {
                          const run = await apiFetch<{ result: ReportResult }>(
                            `/api/v1/saved-reports/${s.id}/run`,
                            { method: 'POST' },
                          );
                          return run.result;
                        });
                      }}
                    >
                      {s.name}
                      <span className="ml-1 text-xs text-muted-foreground">{s.reportId}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </ListState>
          </Panel>
        </div>

        <Panel
          title={current ? current.name : tr('chooseReport')}
          subtitle={
            result ? tr('generatedAt', { when: formatDateTime(result.generatedAt) }) : current?.id
          }
          actions={
            current ? (
              <Button
                size="sm"
                variant="secondary"
                iconLeft="bookmark"
                onClick={() => setSaving(true)}
              >
                Save
              </Button>
            ) : null
          }
        >
          {!current ? (
            <p className="text-sm text-muted-foreground">
              {tr('pickReportBody')}
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
                <Field label={tr('from')}>
                  <Input
                    type="date"
                    value={filters.from}
                    onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                  />
                </Field>
                <Field label={tr('to')}>
                  <Input
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                  />
                </Field>
                <Field label={needsUnit(current.id) ? tr('unitRequired') : tr('unit')}>
                  <Select
                    value={filters.unitId}
                    onChange={(e) => setFilters((f) => ({ ...f, unitId: e.target.value }))}
                  >
                    <option value="">{needsUnit(current.id) ? tr('chooseUnit') : tr('allUnits')}</option>
                    {units.items.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button
                  iconLeft="refresh"
                  loading={running}
                  disabled={needsUnit(current.id) && !filters.unitId}
                  onClick={runSelected}
                >
                  Run
                </Button>
              </div>
              {runError ? <InlineAlert>{runError}</InlineAlert> : null}
              {result ? <ReportData data={result.data} /> : null}
            </div>
          )}
        </Panel>
      </div>

      {saving && current ? (
        <SaveReportDialog
          reportName={current.name}
          onClose={() => setSaving(false)}
          onSave={async (name) => {
            await apiFetch('/api/v1/saved-reports', {
              method: 'POST',
              json: {
                name,
                reportId: current.id,
                filters: {
                  ...(filters.from ? { from: filters.from } : {}),
                  ...(filters.to ? { to: filters.to } : {}),
                  ...(filters.unitId ? { unitId: filters.unitId } : {}),
                },
              },
            });
            setSaving(false);
            push({ tone: 'success', title: tr('reportSaved'), message: name });
            void saved.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function SaveReportDialog({
  reportName,
  onClose,
  onSave,
}: {
  reportName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}): React.ReactElement {
  const tr = useTranslations('AdminReports');
  const [name, setName] = useState(reportName);
  return (
    <FormDialog
      title={tr('saveReport')}
      description={tr('saveReportDesc')}
      submitLabel={tr('save')}
      size="sm"
      onClose={onClose}
      validate={(): Record<string, string> => (name.trim() ? {} : { name: tr('enterName') })}
      onSubmit={() => onSave(name.trim())}
    >
      {(errors) => (
        <Field label={tr('name')} required error={errors.name}>
          <Input data-autofocus value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </Field>
      )}
    </FormDialog>
  );
}
