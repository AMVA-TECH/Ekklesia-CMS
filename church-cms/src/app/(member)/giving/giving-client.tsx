'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch } from '@/app/_ekklesia/session';
import {
  Badge,
  Card,
  CardSubtitle,
  CardTitle,
  EmptyState,
  Metric,
  PageHeader,
  Panel,
  Skeleton,
  StatusPill,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type { MemberPledge } from '../_shared/api-types';
import { formatMoney, formatRelativeToToday } from '../_shared/formatters';
import { useNameLookup } from '../_shared/use-name-lookup';

export function GivingClient(): React.ReactElement {
  const t = useTranslations('MemberGiving');
  const [pledges, setPledges] = useState<MemberPledge[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const fundNames = useNameLookup('/api/v1/funds');

  useEffect(() => {
    let cancelled = false;
    apiFetch<MemberPledge[]>('/api/v1/pledges/unpaid?limit=50')
      .then((data) => {
        if (cancelled) return;
        setPledges(data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
          setForbidden(true);
        } else if (e instanceof ApiError) {
          setError(e.message);
        } else {
          setError(t('connection'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const summary = useMemo(() => {
    const list = pledges ?? [];
    const currency = list[0]?.currency ?? 'TZS';
    const totalMinor = list.reduce((sum, p) => sum + p.amountMinor, 0);
    const appliedMinor = list.reduce(
      (sum, p) => sum + (p.appliedMinor ?? 0),
      0,
    );
    const remainingMinor = Math.max(0, totalMinor - appliedMinor);
    return { currency, totalMinor, appliedMinor, remainingMinor, count: list.length };
  }, [pledges]);

  if (forbidden) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('title')} lede={t('lede')} />
        <EmptyState
          icon="hand"
          tone="gold"
          title={t('privateTitle')}
          description={t('privateBody')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('title')} lede={t('lede')} />

      {loading ? (
        <GivingSkeleton />
      ) : error ? (
        <ErrorCard message={error} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              label={t('openPledges')}
              value={summary.count.toString()}
              icon="hand"
              tone="gold"
              hint={
                summary.count === 0 ? t('nothingOutstanding') : t('stillToPay')
              }
            />
            <Metric
              label={t('remaining')}
              value={
                summary.count === 0
                  ? '—'
                  : formatMoney(summary.remainingMinor, summary.currency)
              }
              icon="wallet"
              tone="gold"
            />
            <Metric
              label={t('pledgedSoFar')}
              value={
                summary.count === 0
                  ? '—'
                  : formatMoney(summary.totalMinor, summary.currency)
              }
              icon="coin"
              tone="neutral"
            />
          </div>

          <Panel title={t('openPledges')} subtitle={t('openPledgesSubtitle')}>
            {(pledges ?? []).length === 0 ? (
              <EmptyState
                icon="hand"
                tone="gold"
                title={t('allCaughtUp')}
                description={t('allCaughtUpBody')}
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {(pledges ?? []).map((pledge) => {
                  const applied = pledge.appliedMinor ?? 0;
                  const remaining = Math.max(0, pledge.amountMinor - applied);
                  const progress =
                    pledge.amountMinor > 0
                      ? Math.min(100, Math.round((applied / pledge.amountMinor) * 100))
                      : 0;
                  const overdue =
                    pledge.dueOn && new Date(pledge.dueOn) < new Date();
                  return (
                    <li key={pledge.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {fundNames.get(pledge.fundId) ?? t('pledgeFallback')}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {t('promised', {
                              amount: formatMoney(
                                pledge.amountMinor,
                                pledge.currency,
                              ),
                            })}
                            {pledge.dueOn
                              ? ` · ${t('due', {
                                  when: formatRelativeToToday(pledge.dueOn),
                                })}`
                              : null}
                          </p>
                        </div>
                        <StatusPill tone={overdue ? 'warning' : 'pending'}>
                          {overdue ? t('overdue') : t('open')}
                        </StatusPill>
                      </div>
                      <div className="mt-3">
                        <div
                          className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={t('percentPaid', { progress })}
                        >
                          <div
                            className="h-full rounded-full bg-brand-gold motion-reduce:transition-none"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {t('paid', {
                              amount: formatMoney(applied, pledge.currency),
                            })}
                          </span>
                          <span>
                            {t('toGo', {
                              amount: formatMoney(remaining, pledge.currency),
                            })}
                          </span>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Card padding="md" className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md tone-gold"
            >
              <Icon name="info" size={18} />
            </span>
            <div>
              <CardTitle>{t('howToPay')}</CardTitle>
              <CardSubtitle>{t('howToPayBody')}</CardSubtitle>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="neutral">{t('mpesaSoon')}</Badge>
                <Badge tone="neutral">{t('tigoSoon')}</Badge>
                <Badge tone="neutral">{t('bankSoon')}</Badge>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function GivingSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton size="block" className="h-28 w-full" radius="md" />
        <Skeleton size="block" className="h-28 w-full" radius="md" />
        <Skeleton size="block" className="h-28 w-full" radius="md" />
      </div>
      <Skeleton size="block" className="h-40 w-full" radius="md" />
    </div>
  );
}

function ErrorCard({ message }: { message: string }): React.ReactElement {
  const t = useTranslations('MemberGiving');
  return (
    <Card padding="lg" className="flex items-start gap-3">
      <Icon
        name="alert-circle"
        size={20}
        className="text-[color:var(--danger-ink)] mt-0.5"
      />
      <div>
        <CardTitle>{t('loadFail')}</CardTitle>
        <CardSubtitle>{message}</CardSubtitle>
      </div>
    </Card>
  );
}
