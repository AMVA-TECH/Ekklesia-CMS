'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
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
import { t } from '@/app/_ekklesia/i18n/core';

/**
 * Finance landing page — a calm overview that lets administrators see the
 * giving picture without diving into a specific sub-module first. Each panel
 * opens into the fuller list screen.
 */
export function FinanceOverviewClient(): React.ReactElement {
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
      nextErrors.push(apiErrorMessage(offRes.reason, 'offerings'));
    }
    if (fundRes.status === 'fulfilled') {
      setFunds(asList(fundRes.value));
    } else {
      setFunds([]);
      nextErrors.push(apiErrorMessage(fundRes.reason, 'funds'));
    }
    if (pledgeRes.status === 'fulfilled') {
      setPledges(asList(pledgeRes.value));
    } else {
      setPledges([]);
      nextErrors.push(apiErrorMessage(pledgeRes.reason, 'pledges'));
    }
    if (unpaidRes.status === 'fulfilled') {
      setUnpaidPledges(asList(unpaidRes.value));
    } else {
      setUnpaidPledges([]);
      nextErrors.push(apiErrorMessage(unpaidRes.reason, 'unpaid pledges'));
    }

    setErrors(nextErrors);
    setLoading(false);
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
        title={t('Finance')}
        lede={t('A calm overview of giving — offerings, funds, and open pledges. Drill in for the full ledger.')}
        actions={
          <>
            <Link
              href="/admin/finance/offerings"
              className={buttonClassName({ variant: 'secondary' })}
            >
              <Icon name="coin" size={14} />
              {t('Offerings')}
            </Link>
            <Link
              href="/admin/finance/funds"
              className={buttonClassName({ variant: 'primary' })}
            >
              <Icon name="briefcase" size={14} />
              {t('Funds')}
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
          {t('Giving metrics')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label={t('Recent offerings')}
            value={loading ? '—' : formatMoney(offeringsTotal, currency)}
            icon="coin"
            tone="peach"
            href="/admin/finance/offerings"
            hint={t('Last 50 recorded')}
          />
          <Metric
            label={t('Active funds')}
            value={loading ? '—' : formatCount(funds.filter((f) => f.status === 'active').length)}
            icon="briefcase"
            tone="gold"
            href="/admin/finance/funds"
            hint={t('{0} total', funds.length)}
          />
          <Metric
            label={t('Pledge total')}
            value={loading ? '—' : formatMoney(pledgeTotal, currency)}
            icon="hand"
            tone="sage"
            href="/admin/finance/pledges"
            hint={t('{0} pledges', pledges.length)}
          />
          <Metric
            label={t('Still owed')}
            value={loading ? '—' : formatMoney(unpaidTotal, currency)}
            icon="alert-circle"
            tone="neutral"
            href="/admin/finance/pledges"
            hint={t('{0} open', unpaidPledges.length)}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={t('Recent offerings')}
          subtitle={t('Most recent first.')}
          linkHref="/finance/offerings"
        >
          {loading ? (
            <Skeleton size="block" />
          ) : offerings.length === 0 ? (
            <EmptyState
              icon="coin"
              tone="peach"
              title={t('No offerings recorded')}
              description={t('Record a Sunday collection and it\'ll show up here.')}
              action={
                <Link
                  href="/admin/finance/offerings"
                  className={buttonClassName({
                    variant: 'primary',
                    size: 'sm',
                  })}
                >
                  {t('Record offering')}
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
                      {t('Posted')}
                    </StatusPill>
                  ) : (
                    <StatusPill tone="pending" hideDot>
                      {t('Draft')}
                    </StatusPill>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={t('Funds')}
          subtitle={t('Where giving is directed.')}
          linkHref="/finance/funds"
        >
          {loading ? (
            <Skeleton size="block" />
          ) : funds.length === 0 ? (
            <EmptyState
              icon="briefcase"
              tone="gold"
              title={t('No funds yet')}
              description={t('Create your first fund (e.g. general, missions) to categorise offerings.')}
              action={
                <Link
                  href="/admin/finance/funds"
                  className={buttonClassName({ variant: 'primary', size: 'sm' })}
                >
                  {t('New fund')}
                </Link>
              }
            />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR noHover>
                    <TH>{t('Code')}</TH>
                    <TH>{t('Name')}</TH>
                    <TH>{t('Type')}</TH>
                    <TH>{t('Status')}</TH>
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
                          {titleCase(f.status)}
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
        title={t('Open pledges')}
        subtitle={t('Pledges that haven\'t been fully received yet.')}
        linkHref="/finance/pledges"
      >
        {loading ? (
          <Skeleton size="block" />
        ) : unpaidPledges.length === 0 ? (
          <EmptyState
            icon="check-circle"
            tone="sage"
            title={t('All pledges are up to date')}
            description={t('Nothing outstanding. We\'ll surface open pledges here when they arrive.')}
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{t('Amount')}</TH>
                  <TH>{t('Applied')}</TH>
                  <TH>{t('Still owed')}</TH>
                  <TH>{t('Due')}</TH>
                  <TH>{t('Status')}</TH>
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
                        {titleCase(p.status)}
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

function apiErrorMessage(reason: unknown, label: string): string {
  if (reason instanceof ApiError) {
    return `${label}: ${reason.status} ${reason.message}`;
  }
  if (reason instanceof Error) return `${label}: ${reason.message}`;
  return `${label}: unavailable`;
}
