'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Button,
  EmptyState,
  Metric,
  PageHeader,
  Panel,
  Skeleton,
  StatusPill,
  Tab,
  Tabs,
  TabList,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/app/_ekklesia/ui';
import type { Fund, Pledge } from '../../../_lib/api-types';
import { formatDate, formatMoney, titleCase } from '../../../_lib/format';
import { asList } from '../../../_lib/list';
import { usePeopleNames } from '../../../_lib/use-people-names';
import { AddFollowUpDialog } from './add-follow-up-dialog';
import { RecordPaymentDialog } from './record-payment-dialog';
import { CreatePledgeDialog } from './create-pledge-dialog';

const FILTER_VALUES = ['all', 'open', 'partial', 'fulfilled'] as const;

export function PledgesClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tf = useTranslations('AdminFinance');
  const tc = useTranslations('Common');
  const { push } = useToast();
  const [filter, setFilter] = useState('all');
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [unpaid, setUnpaid] = useState<Pledge[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [paying, setPaying] = useState<Pledge | null>(null);
  const [followUpPledgeId, setFollowUpPledgeId] = useState<string | null>(
    null,
  );

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, upRes, fRes] = await Promise.all([
        apiFetch<Pledge[] | { data: Pledge[] }>('/api/v1/pledges'),
        apiFetch<Pledge[] | { data: Pledge[] }>('/api/v1/pledges/unpaid'),
        apiFetch<Fund[] | { data: Fund[] }>('/api/v1/funds'),
      ]);
      setPledges(asList(pRes));
      setUnpaid(asList(upRes));
      setFunds(asList(fRes));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : tf('unableLoadPledges'),
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  useLoadEffect(load);

  const fundMap = useMemo(
    () => Object.fromEntries(funds.map((f) => [f.id, f] as const)),
    [funds],
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return pledges;
    return pledges.filter((p) => p.status === filter);
  }, [pledges, filter]);

  const currency = pledges[0]?.currency ?? 'TZS';
  const totalPledged = pledges.reduce((sum, p) => sum + (p.amountMinor ?? 0), 0);
  const totalApplied = pledges.reduce(
    (sum, p) => sum + (p.appliedMinor ?? 0),
    0,
  );
  const totalOutstanding = unpaid.reduce(
    (sum, p) => sum + Math.max(0, (p.amountMinor ?? 0) - (p.appliedMinor ?? 0)),
    0,
  );

  const filterLabel = (value: string): string => {
    switch (value) {
      case 'all':
        return tf('filterAll');
      case 'open':
        return tf('filterOpen');
      case 'partial':
        return tf('filterPartial');
      case 'fulfilled':
        return tf('filterFulfilled');
      default:
        return titleCase(value);
    }
  };

  const statusLabel = (status: string): string => {
    switch (status) {
      case 'open':
        return tf('statusOpen');
      case 'partial':
        return tf('statusPartial');
      case 'fulfilled':
        return tf('statusFulfilled');
      case 'cancelled':
        return tf('statusCancelled');
      default:
        return titleCase(status);
    }
  };
  const pledgers = usePeopleNames(pledges.map((p) => p.personId));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('pledges')}
        lede={t('pledgesLede')}
        actions={
          <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
            {tf('newPledge')}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label={tf('totalPledged')}
          value={loading ? '—' : formatMoney(totalPledged, currency)}
          icon="hand"
          tone="sage"
        />
        <Metric
          label={tf('received')}
          value={loading ? '—' : formatMoney(totalApplied, currency)}
          icon="check-circle"
          tone="peach"
        />
        <Metric
          label={tf('stillOwed')}
          value={loading ? '—' : formatMoney(totalOutstanding, currency)}
          icon="alert-circle"
          tone="neutral"
        />
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabList>
          {FILTER_VALUES.map((value) => (
            <Tab key={value} value={value}>
              {filterLabel(value)}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={
          filter === 'all'
            ? tf('allPledges')
            : tf('filteredPledges', { status: filterLabel(filter) })
        }
        subtitle={error ?? undefined}
        flush
      >
        {error ? (
          <div className="px-5 py-8 text-center text-sm text-[color:var(--danger-ink)]">
            {error}
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={load}>
                {tc('retry')}
              </Button>
            </div>
          </div>
        ) : loading && filtered.length === 0 ? (
          <div className="px-5 py-6 space-y-3">
            <Skeleton size="block" />
            <Skeleton size="block" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="hand"
            tone="sage"
            title={tf('noPledgesToShow')}
            description={tf('noPledgesBody')}
            action={
              <Button
                iconLeft="plus"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                {tf('newPledge')}
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tf('pledgedBy')}</TH>
                  <TH>{tf('amount')}</TH>
                  <TH>{tf('received')}</TH>
                  <TH>{tf('outstanding')}</TH>
                  <TH>{tf('fund')}</TH>
                  <TH>{tf('due')}</TH>
                  <TH>{tf('status')}</TH>
                  <TH className="text-right">
                    <span className="sr-only">{tf('actions')}</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((p) => {
                  const outstanding = Math.max(
                    0,
                    (p.amountMinor ?? 0) - (p.appliedMinor ?? 0),
                  );
                  return (
                    <TR key={p.id}>
                      <TD className="font-medium text-foreground">
                        {p.personId ? (
                          <Link href={`/admin/people/${p.personId}`} className="hover:underline">
                            {pledgers[p.personId] ?? '…'}
                          </Link>
                        ) : (
                          tf('householdPledge')
                        )}
                      </TD>
                      <TD className="font-medium tabular-nums">
                        {formatMoney(p.amountMinor, p.currency)}
                      </TD>
                      <TD className="tabular-nums text-muted-foreground">
                        {formatMoney(p.appliedMinor ?? 0, p.currency)}
                      </TD>
                      <TD className="tabular-nums font-medium">
                        {formatMoney(outstanding, p.currency)}
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {p.fundId ? fundMap[p.fundId]?.name ?? '—' : '—'}
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {p.dueOn ? formatDate(p.dueOn) : '—'}
                      </TD>
                      <TD>
                        <StatusPill tone={statusTone(p.status)}>
                          {statusLabel(p.status)}
                        </StatusPill>
                      </TD>
                      <TD className="text-right">
                        {p.status !== 'cancelled' &&
                        p.status !== 'fulfilled' ? (
                          <div className="inline-flex gap-2">
                            <Button size="sm" iconLeft="coin" onClick={() => setPaying(p)}>
                              {tf('recordPayment')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setFollowUpPledgeId(p.id)}
                            >
                              {tf('followUp')}
                            </Button>
                          </div>
                        ) : null}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <CreatePledgeDialog
        open={createOpen}
        funds={funds}
        onClose={() => setCreateOpen(false)}
        onCreated={(pledge) => {
          push({
            tone: 'success',
            title: tf('pledgeCreated'),
            message: formatMoney(pledge.amountMinor, pledge.currency),
          });
          setCreateOpen(false);
          void load();
        }}
      />

      {paying ? (
        <RecordPaymentDialog
          pledge={paying}
          pledgerName={paying.personId ? (pledgers[paying.personId] ?? tf('thisMember')) : tf('thisHousehold')}
          onClose={() => setPaying(null)}
          onRecorded={(amountMinor) => {
            push({
              tone: 'success',
              title: tf('paymentRecorded'),
              message: tf('paymentRecordedBody', {
                amount: formatMoney(amountMinor, paying.currency),
              }),
            });
            setPaying(null);
            void load();
          }}
        />
      ) : null}

      <AddFollowUpDialog
        open={followUpPledgeId !== null}
        pledgeId={followUpPledgeId}
        onClose={() => setFollowUpPledgeId(null)}
        onSaved={() => {
          push({
            tone: 'success',
            title: tf('followUpSaved'),
            message: tf('followUpSavedBody'),
          });
        }}
      />
    </div>
  );
}

function statusTone(
  status: string,
): 'pending' | 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'open':
      return 'pending';
    case 'partial':
      return 'warning';
    case 'fulfilled':
      return 'success';
    default:
      return 'neutral';
  }
}
