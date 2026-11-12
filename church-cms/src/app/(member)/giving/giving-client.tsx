'use client';

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

export function GivingClient(): React.ReactElement {
  const [pledges, setPledges] = useState<MemberPledge[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setForbidden(false);
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
          setError('Check your connection and try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <PageHeader
          title="Giving"
          lede="Your pledges and offerings with this church."
        />
        <EmptyState
          icon="hand"
          tone="gold"
          title="Giving is private"
          description="Giving details are shared with members as your church rolls them out. Your church office can tell you when this will be available for your account."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Giving"
        lede="Your pledges and offerings with this church."
      />

      {loading ? (
        <GivingSkeleton />
      ) : error ? (
        <ErrorCard message={error} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              label="Open pledges"
              value={summary.count.toString()}
              icon="hand"
              tone="gold"
              hint={summary.count === 0 ? 'Nothing outstanding' : 'Still to pay'}
            />
            <Metric
              label="Remaining"
              value={
                summary.count === 0
                  ? '—'
                  : formatMoney(summary.remainingMinor, summary.currency)
              }
              icon="wallet"
              tone="gold"
            />
            <Metric
              label="Pledged so far"
              value={
                summary.count === 0
                  ? '—'
                  : formatMoney(summary.totalMinor, summary.currency)
              }
              icon="coin"
              tone="neutral"
            />
          </div>

          <Panel
            title="Open pledges"
            subtitle="Promises you made to support a fund."
          >
            {(pledges ?? []).length === 0 ? (
              <EmptyState
                icon="hand"
                tone="gold"
                title="You’re all caught up"
                description="You don’t have any open pledges. When you make a new pledge with your church, it will appear here."
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
                            Pledge to fund ·{' '}
                            <span className="font-normal text-muted-foreground">
                              {pledge.fundId.slice(0, 8)}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Promised {formatMoney(pledge.amountMinor, pledge.currency)}
                            {pledge.dueOn
                              ? ` · Due ${formatRelativeToToday(pledge.dueOn)}`
                              : null}
                          </p>
                        </div>
                        <StatusPill tone={overdue ? 'warning' : 'pending'}>
                          {overdue ? 'Overdue' : 'Open'}
                        </StatusPill>
                      </div>
                      <div className="mt-3">
                        <div
                          className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${progress}% paid`}
                        >
                          <div
                            className="h-full rounded-full bg-brand-gold motion-reduce:transition-none"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {formatMoney(applied, pledge.currency)} paid
                          </span>
                          <span>
                            {formatMoney(remaining, pledge.currency)} to go
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
              <CardTitle>How to pay</CardTitle>
              <CardSubtitle>
                Your church will share payment instructions when mobile money or
                bank options are set up. For now, drop by the church office to make a payment.
              </CardSubtitle>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="neutral">M-Pesa · coming soon</Badge>
                <Badge tone="neutral">Tigo Pesa · coming soon</Badge>
                <Badge tone="neutral">Bank transfer · coming soon</Badge>
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
  return (
    <Card padding="lg" className="flex items-start gap-3">
      <Icon
        name="alert-circle"
        size={20}
        className="text-[color:var(--danger-ink)] mt-0.5"
      />
      <div>
        <CardTitle>We couldn’t load your giving</CardTitle>
        <CardSubtitle>{message}</CardSubtitle>
      </div>
    </Card>
  );
}
