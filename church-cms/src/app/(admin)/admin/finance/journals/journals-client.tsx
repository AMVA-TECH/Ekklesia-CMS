'use client';

import { Fragment, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/app/_ekklesia/session';
import {
  Button,
  PageHeader,
  Panel,
  StatusPill,
  Tab,
  TabList,
  Table,
  TableWrap,
  Tabs,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/app/_ekklesia/ui';
import type { Fund } from '../../../_lib/api-types';
import { ListState, useRowAction } from '../../../_components/kit';
import { formatDate, formatMoney } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import {
  accountLabel,
  type Account,
  type FinancialYear,
  type Journal,
} from '../_lib/finance-types';
import { CreateJournalDialog } from './create-journal-dialog';

const FILTERS = ['all', 'draft', 'posted', 'reversed'] as const;
type Filter = (typeof FILTERS)[number];

const TONE = { draft: 'pending', posted: 'success', reversed: 'neutral' } as const;

export function JournalsClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tf = useTranslations('AdminFinance');
  const [filter, setFilter] = useState<Filter>('all');
  const journals = useApiList<Journal>(
    `/api/v1/journals?limit=100${filter === 'all' ? '' : `&status=${filter}`}`,
  );
  const accounts = useApiList<Account>('/api/v1/accounts');
  const funds = useApiList<Fund>('/api/v1/funds');
  const years = useApiList<FinancialYear>('/api/v1/financial-years');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { busyKey, run } = useRowAction();

  const accountById = useMemo(
    () => new Map(accounts.items.map((a) => [a.id, a])),
    [accounts.items],
  );
  const fundById = useMemo(() => new Map(funds.items.map((f) => [f.id, f])), [funds.items]);
  const yearById = useMemo(() => new Map(years.items.map((y) => [y.id, y])), [years.items]);

  const statusLabel = (status: string): string => {
    switch (status) {
      case 'all':
        return tf('statusAll');
      case 'draft':
        return tf('statusDraft');
      case 'posted':
        return tf('statusPosted');
      case 'reversed':
        return tf('statusReversed');
      default:
        return status;
    }
  };

  const act = async (j: Journal, action: 'post' | 'reverse'): Promise<void> => {
    const ok = await run(
      `${j.id}:${action}`,
      () => apiFetch(`/api/v1/journals/${j.id}/${action}`, { method: 'POST' }),
      action === 'post'
        ? { success: tf('journalPosted', { entry: j.entryNumber }), failure: tf('couldNotPostJournal') }
        : {
            success: tf('journalReversed', { entry: j.entryNumber }),
            detail: tf('reversingEntryCreated'),
            failure: tf('couldNotReverseJournal'),
          },
    );
    if (ok) void journals.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('journals')}
        lede={t('journalsLede')}
        actions={
          <Button iconLeft="plus" onClick={() => setCreating(true)}>
            {tf('newJournal')}
          </Button>
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabList aria-label={tf('journalStatusAria')}>
          {FILTERS.map((f) => (
            <Tab key={f} value={f}>
              {statusLabel(f)}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={tf('entries')}
        subtitle={
          journals.loading
            ? tf('loading')
            : tf('shownNewestFirst', { count: journals.items.length })
        }
        flush
      >
        <ListState
          loading={journals.loading}
          error={journals.error}
          forbidden={journals.forbidden}
          isEmpty={journals.items.length === 0}
          onRetry={() => void journals.reload()}
          empty={{
            icon: 'book',
            title: tf('noJournalEntries'),
            description: tf('noJournalEntriesBody'),
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tf('entry')}</TH>
                  <TH>{tf('date')}</TH>
                  <TH className="hidden lg:table-cell">{tf('memo')}</TH>
                  <TH className="text-right">{tf('amount')}</TH>
                  <TH>{tf('status')}</TH>
                  <TH className="text-right">{tf('actions')}</TH>
                </TR>
              </THead>
              <TBody>
                {journals.items.map((j) => {
                  const total = j.lines.reduce((s, l) => s + l.debitMinor, 0);
                  const currency = j.lines[0]?.currency ?? 'TZS';
                  const open = expanded === j.id;
                  return (
                    <Fragment key={j.id}>
                      <TR>
                        <TD>
                          <button
                            type="button"
                            className="-my-2 inline-flex min-h-10 items-center whitespace-nowrap font-mono text-xs font-medium text-foreground hover:underline focus-ring"
                            aria-expanded={open}
                            onClick={() => setExpanded(open ? null : j.id)}
                          >
                            {j.entryNumber}
                          </button>
                          <div className="text-xs text-muted-foreground">
                            {yearById.get(j.financialYearId)?.label ?? ''}
                          </div>
                        </TD>
                        <TD className="text-sm">{formatDate(j.journalDate)}</TD>
                        <TD className="hidden max-w-xs truncate text-sm text-muted-foreground lg:table-cell">
                          {j.memo ?? '—'}
                        </TD>
                        <TD className="text-right tabular-nums">{formatMoney(total, currency)}</TD>
                        <TD>
                          <StatusPill tone={TONE[j.status]}>{statusLabel(j.status)}</StatusPill>
                        </TD>
                        <TD className="text-right">
                          {j.status === 'draft' ? (
                            <Button
                              size="sm"
                              loading={busyKey === `${j.id}:post`}
                              disabled={busyKey !== null}
                              onClick={() => void act(j, 'post')}
                            >
                              {tf('post')}
                            </Button>
                          ) : j.status === 'posted' && !j.reversesEntryId ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={busyKey === `${j.id}:reverse`}
                              disabled={busyKey !== null}
                              onClick={() => void act(j, 'reverse')}
                            >
                              {tf('reverse')}
                            </Button>
                          ) : null}
                        </TD>
                      </TR>
                      {open ? (
                        <TR noHover>
                          <TD colSpan={6} className="bg-surface-muted">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-xs text-muted-foreground">
                                  <th className="py-1 font-medium">{tf('account')}</th>
                                  <th className="py-1 font-medium">{tf('fund')}</th>
                                  <th className="py-1 font-medium">{tf('memo')}</th>
                                  <th className="py-1 text-right font-medium">{tf('debit')}</th>
                                  <th className="py-1 text-right font-medium">{tf('credit')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {j.lines.map((l) => (
                                  <tr key={l.id}>
                                    <td className="py-1">{accountLabel(accountById.get(l.accountId))}</td>
                                    <td className="py-1">{l.fundId ? (fundById.get(l.fundId)?.name ?? '—') : '—'}</td>
                                    <td className="py-1 text-muted-foreground">{l.memo ?? ''}</td>
                                    <td className="py-1 text-right tabular-nums">
                                      {l.debitMinor ? formatMoney(l.debitMinor, l.currency) : ''}
                                    </td>
                                    <td className="py-1 text-right tabular-nums">
                                      {l.creditMinor ? formatMoney(l.creditMinor, l.currency) : ''}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </TD>
                        </TR>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        </ListState>
      </Panel>

      {creating ? (
        <CreateJournalDialog
          accounts={accounts.items}
          funds={funds.items}
          years={years.items.filter((y) => y.status === 'open')}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void journals.reload();
          }}
        />
      ) : null}
    </div>
  );
}
