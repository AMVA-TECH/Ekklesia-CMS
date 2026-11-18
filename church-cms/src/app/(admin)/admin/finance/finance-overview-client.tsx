'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
import {
  buttonClassName,
  EmptyState,
  Metric,
  PageHeader,
  Panel,
  Skeleton,
  StatusPill,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type { Fund, Offering, Pledge } from '../../_lib/api-types';
import { formatCount, formatDate, formatMoney, titleCase } from '../../_lib/format';
import { asList } from '../../_lib/list';

/**
 * Finance landing page — a calm overview that lets administrators see the
 * giving picture without diving into a specific sub-module first. Each panel
 * opens into the fuller list screen.
 */
export function FinanceOverviewClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tf = useTranslations('AdminFinance');
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [unpaidPledges, setUnpaidPledges] = useState<Pledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setErrors([]);
    const results = await Promise.allSettled([
      apiFetch<Offering[] | { data: Offering[] }>('/api/v1/offerings?limit=50'),
      apiFetch<Fund[] | { data: Fund[] }>('/api/v1/funds'),
      apiFetch<Pledge[] | { data: Pledge[] }>('/api/v1/pledges'),
      apiFetch<Pledge[] | { data: Pledge[] }>('/api/v1/pledges/unpaid'),
    ]);
    const [offRes, fundRes, pledgeRes, unpaidRes] = results;
    const nextErrors: string[] = [];

    if (offRes.status === 'fulfilled') {
      setOfferings(asList(offRes.value));
    } else {
      setOfferings([]);
      nextErrors.push(apiErrorMessage(offRes.reason, tf('labelOfferings'), tf));
    }
    if (fundRes.status === 'fulfilled') {
      setFunds(asList(fundRes.value));
    } else {
      setFunds([]);
      nextErrors.push(apiErrorMessage(fundRes.reason, tf('labelFunds'), tf));
    }
    if (pledgeRes.status === 'fulfilled') {
      setPledges(asList(pledgeRes.value));
    } else {
      setPledges([]);
      nextErrors.push(apiErrorMessage(pledgeRes.reason, tf('labelPledges'), tf));
    }
    if (unpaidRes.status === 'fulfilled') {
      setUnpaidPledges(asList(unpaidRes.value));
    } else {
      setUnpaidPledges([]);
      nextErrors.push(apiErrorMessage(unpaidRes.reason, tf('labelUnpaidPledges'), tf));
    }

    setErrors(nextErrors);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  useLoadEffect(load);

  const currency = offerings[0]?.currency ?? pledges[0]?.currency ?? 'TZS';
  const offeringsTotal = offerings.reduce(
    (sum, o) => sum + (o.amountMinor ?? 0),
    0,
  );
  const pledgeTotal = pledges.reduce(
    (sum, p) => sum + (p.amountMinor ?? 0),
    0,
  );
  const unpaidTotal = unpaidPledges.reduce(
    (sum, p) => sum + Math.max(0, (p.amountMinor ?? 0) - (p.appliedMinor ?? 0)),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('finance')}
        lede={t('financeLede')}
        actions={
          <>
            <Link
              href="/admin/finance/offerings"
              className={buttonClassName({ variant: 'secondary' })}
            >
              <Icon name="coin" size={14} />
              {tf('offerings')}
            </Link>
            <Link
              href="/admin/finance/funds"
              className={buttonClassName({ variant: 'primary' })}
            >
              <Icon name="briefcase" size={14} />
              {tf('funds')}
            </Link>
          </>
        }
      />

      {errors.length > 0 ? (
        <ul className="rounded-md border border-[color:var(--warning-soft)] bg-[color:var(--warning-soft)] px-3 py-2 text-sm text-[color:var(--warning-ink)] space-y-1">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      ) : null}

      <section aria-labelledby="finance-metrics">
        <h2 id="finance-metrics" className="sr-only">
          {tf('givingMetrics')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label={tf('recentOfferings')}
            value={loading ? '—' : formatMoney(offeringsTotal, currency)}
            icon="coin"
            tone="peach"
            href="/admin/finance/offerings"
            hint={tf('last50Recorded')}
          />
          <Metric
            label={tf('activeFunds')}
            value={loading ? '—' : formatCount(funds.filter((f) => f.status === 'active').length)}
            icon="briefcase"
            tone="gold"
            href="/admin/finance/funds"
            hint={tf('fundsTotal', { count: funds.length })}
          />
          <Metric
            label={tf('pledgeTotal')}
            value={loading ? '—' : formatMoney(pledgeTotal, currency)}
            icon="hand"
            tone="sage"
            href="/admin/finance/pledges"
            hint={tf('pledgesCount', { count: pledges.length })}
          />
          <Metric
            label={tf('stillOwed')}
            value={loading ? '—' : formatMoney(unpaidTotal, currency)}
            icon="alert-circle"
            tone="neutral"
            href="/admin/finance/pledges"
            hint={tf('openCount', { count: unpaidPledges.length })}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={tf('recentOfferings')}
          subtitle={tf('recentOfferingsSubtitle')}
          linkHref="/finance/offerings"
        >
          {loading ? (
            <Skeleton size="block" />
          ) : offerings.length === 0 ? (
            <EmptyState
              icon="coin"
              tone="peach"
              title={tf('noOfferingsRecorded')}
              description={tf('noOfferingsOverviewBody')}
              action={
                <Link
                  href="/admin/finance/offerings"
                  className={buttonClassName({
                    variant: 'primary',
                    size: 'sm',
                  })}
                >
                  {tf('recordOffering')}
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {offerings.slice(0, 6).map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatMoney(o.amountMinor, o.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(o.serviceDate)}
                      {o.note ? ` · ${o.note}` : ''}
                    </p>
                  </div>
                  {o.postedAt ? (
                    <StatusPill tone="success" hideDot>
                      {tf('posted')}
                    </StatusPill>
                  ) : (
                    <StatusPill tone="pending" hideDot>
                      {tf('draft')}
                    </StatusPill>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={tf('funds')}
          subtitle={tf('fundsPanelSubtitle')}
          linkHref="/finance/funds"
        >
          {loading ? (
            <Skeleton size="block" />
          ) : funds.length === 0 ? (
            <EmptyState
              icon="briefcase"
              tone="gold"
              title={tf('noFundsYet')}
              description={tf('noFundsOverviewBody')}
              action={
                <Link
                  href="/admin/finance/funds"
                  className={buttonClassName({ variant: 'primary', size: 'sm' })}
                >
                  {tf('newFund')}
                </Link>
              }
            />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR noHover>
                    <TH>{tf('code')}</TH>
                    <TH>{tf('name')}</TH>
                    <TH>{tf('type')}</TH>
                    <TH>{tf('status')}</TH>
                  </TR>
                </THead>
                <TBody>
                  {funds.slice(0, 6).map((f) => (
                    <TR key={f.id}>
                      <TD className="font-mono text-xs">{f.code}</TD>
                      <TD className="font-medium text-foreground">{f.name}</TD>
                      <TD className="text-sm text-muted-foreground">
                        {titleCase(f.fundType)}
                      </TD>
                      <TD>
                        <StatusPill
                          tone={f.status === 'active' ? 'success' : 'neutral'}
                        >
                          {f.status === 'active' ? tf('statusActive') : titleCase(f.status)}
                        </StatusPill>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Panel>
      </div>

      <Panel
        title={tf('openPledges')}
        subtitle={tf('openPledgesSubtitle')}
        linkHref="/finance/pledges"
      >
        {loading ? (
          <Skeleton size="block" />
        ) : unpaidPledges.length === 0 ? (
          <EmptyState
            icon="check-circle"
            tone="sage"
            title={tf('allPledgesUpToDate')}
            description={tf('allPledgesUpToDateBody')}
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tf('amount')}</TH>
                  <TH>{tf('applied')}</TH>
                  <TH>{tf('stillOwed')}</TH>
                  <TH>{tf('due')}</TH>
                  <TH>{tf('status')}</TH>
                </TR>
              </THead>
              <TBody>
                {unpaidPledges.slice(0, 8).map((p) => (
                  <TR key={p.id}>
                    <TD className="font-medium">
                      {formatMoney(p.amountMinor, p.currency)}
                    </TD>
                    <TD className="tabular-nums">
                      {formatMoney(p.appliedMinor ?? 0, p.currency)}
                    </TD>
                    <TD className="tabular-nums font-medium text-foreground">
                      {formatMoney(
                        Math.max(
                          0,
                          (p.amountMinor ?? 0) - (p.appliedMinor ?? 0),
                        ),
                        p.currency,
                      )}
                    </TD>
                    <TD className="text-sm text-muted-foreground">
                      {p.dueOn ? formatDate(p.dueOn) : '—'}
                    </TD>
                    <TD>
                      <StatusPill tone={pledgeStatusTone(p.status)}>
                        {pledgeStatusLabel(p.status, tf)}
                      </StatusPill>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}

function pledgeStatusTone(
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

type FinanceT = (key: string, values?: Record<string, string | number>) => string;

function pledgeStatusLabel(status: string, tf: FinanceT): string {
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
}

function apiErrorMessage(reason: unknown, label: string, tf: FinanceT): string {
  if (reason instanceof ApiError) {
    return tf('loadErrorLabel', { label, detail: `${reason.status} ${reason.message}` });
  }
  if (reason instanceof Error) {
    return tf('loadErrorLabel', { label, detail: reason.message });
  }
  return tf('loadErrorLabel', { label, detail: tf('unavailable') });
}
