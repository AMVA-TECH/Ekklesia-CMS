'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import {
  apiFetch,
  ApiError,
  useSession,
  useLoadEffect,
} from '@/app/_ekklesia/session';
import {
  buttonClassName,
  EmptyState,
  Metric,
  Panel,
  Skeleton,
  StatusPill,
  useIsClient,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type {
  ApprovalRequest,
  EventRow,
  ListEnvelope,
  ListMeta,
  Membership,
  OrganisationalUnit,
  Offering,
  Person,
} from '../../_lib/api-types';
import { formatCount, formatDate, formatDateTime, formatMoney, titleCase } from '../../_lib/format';
import { asList } from '../../_lib/list';
import { t } from '@/app/_ekklesia/i18n/core';

interface DashboardCounts {
  people: number | null;
  members: number | null;
  /** More active members exist than the page we counted. */
  membersMore: boolean;
  ministries: number | null;
  pendingApprovals: number | null;
  offeringsTotalMinor: number | null;
  offeringsCurrency: string;
  upcomingEvents: number | null;
}

const EMPTY_COUNTS: DashboardCounts = {
  people: null,
  members: null,
  membersMore: false,
  ministries: null,
  pendingApprovals: null,
  offeringsTotalMinor: null,
  offeringsCurrency: 'TZS',
  upcomingEvents: null,
};

/**
 * Admin dashboard — mockup composition (hero, tinted KPIs, attendance panel,
 * upcoming events, ministries CTA) with live `/api/v1/*` data only.
 */
export function DashboardClient(): React.ReactElement {
  const { user, church, loading: sessionLoading } = useSession();
  const [counts, setCounts] = useState<DashboardCounts>(EMPTY_COUNTS);
  const [upcoming, setUpcoming] = useState<EventRow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      apiFetch<ListEnvelope<Person> & { meta?: ListMeta }>('/api/v1/people?limit=1'),
      apiFetch<ListEnvelope<Membership> & { meta?: ListMeta }>(
        '/api/v1/memberships?status=active&limit=100',
      ),
      apiFetch<OrganisationalUnit[] | { data: OrganisationalUnit[] }>(
        '/api/v1/organisational-units',
      ),
      apiFetch<ApprovalRequest[] | { data: ApprovalRequest[] }>(
        '/api/v1/approval-requests?status=pending',
      ),
      apiFetch<EventRow[] | { data: EventRow[] }>(
        `/api/v1/events?from=${isoToday()}&limit=5`,
      ),
      apiFetch<Offering[] | { data: Offering[] }>('/api/v1/offerings?limit=30'),
    ]);

    const [
      peopleRes,
      membersRes,
      ministriesRes,
      approvalsRes,
      eventsRes,
      offeringsRes,
    ] = results;

    const nextCounts: DashboardCounts = { ...EMPTY_COUNTS };

    if (peopleRes.status === 'fulfilled') {
      nextCounts.people = countFromEnvelope(peopleRes.value);
    }
    if (membersRes.status === 'fulfilled') {
      nextCounts.members = countFromEnvelope(membersRes.value);
      const meta = (membersRes.value as { meta?: ListMeta }).meta;
      nextCounts.membersMore = Boolean(meta?.hasMore);
    }
    if (ministriesRes.status === 'fulfilled') {
      nextCounts.ministries = asList(ministriesRes.value).length;
    }
    if (approvalsRes.status === 'fulfilled') {
      const list = asList(approvalsRes.value);
      nextCounts.pendingApprovals = list.length;
      setApprovals(list.slice(0, 5));
    } else {
      setApprovals([]);
    }
    if (offeringsRes.status === 'fulfilled') {
      const offerings = asList(offeringsRes.value);
      if (offerings.length > 0) {
        nextCounts.offeringsCurrency = offerings[0]?.currency ?? 'TZS';
        nextCounts.offeringsTotalMinor = offerings.reduce(
          (sum, o) => sum + (o.amountMinor ?? 0),
          0,
        );
      } else {
        nextCounts.offeringsTotalMinor = 0;
      }
    }
    if (eventsRes.status === 'fulfilled') {
      const events = asList(eventsRes.value);
      setUpcoming(events.slice(0, 5));
      nextCounts.upcomingEvents = events.length;
    } else {
      setUpcoming([]);
      nextCounts.upcomingEvents = null;
    }

    setCounts(nextCounts);

    const anySucceeded = results.some((r) => r.status === 'fulfilled');
    if (!anySucceeded) {
      const first = results.find((r) => r.status === 'rejected') as
        | PromiseRejectedResult
        | undefined;
      const reason = first?.reason;
      setError(
        reason instanceof ApiError
          ? reason.message
          : reason instanceof Error
            ? reason.message
            : t('Could not reach the backend.'),
      );
    }
    setLoading(false);
  }, []);

  useLoadEffect(refresh);

  // Time-of-day greeting is client-only (server clock/timezone differ), so
  // render the neutral fallback until hydrated.
  const isClient = useIsClient();
  const greeting = isClient ? buildGreeting(user?.displayName) : t('Welcome');

  const churchLabel = church?.name ?? 'your church';
  // displayName can fall back to the email address; show a tidy first name.
  const rawFirst = user?.displayName?.split(/[\s@._]/)[0] ?? '';
  const firstName = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1) : '';

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Welcome hero — mockup band with church photo */}
      <section
        aria-labelledby="dashboard-welcome"
        className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
      >
        <div className="absolute inset-0">
          {/* Replace /brand/imagery/hero-church.jpg with church-owned photos */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/imagery/hero-church.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/92 to-surface/35" />
        </div>
        <div className="relative flex min-h-[11rem] flex-col justify-center gap-2 px-5 py-7 sm:px-8 sm:py-9 lg:max-w-[58%]">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {sessionLoading ? '…' : churchLabel}
          </p>
          <h1
            id="dashboard-welcome"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            {greeting}
            {firstName ? (
              <>
                {greeting.includes(',') ? '' : ','}{' '}
                <span className="text-[color:var(--brand-gold-ink)]">{firstName}</span>
              </>
            ) : null}
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            {t('Here\'s what\'s happening at')} {churchLabel}.
          </p>
          <div className="mt-2">
            <Link
              href="/admin/events"
              className={buttonClassName({ variant: 'primary', size: 'sm' })}
            >
              <Icon name="plus" size={14} />
              {t('New service')}
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <div
          role="alert"
          className="rounded-card border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger-ink)]"
        >
          {error}
        </div>
      ) : null}

      {/* Tinted metrics — mockup row */}
      <section aria-labelledby="dashboard-metrics">
        <h2 id="dashboard-metrics" className="sr-only">
          {t('Key numbers')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
            </>
          ) : (
            <>
              <Metric
                label={t('Members')}
                value={
                  counts.members === null
                    ? '—'
                    : `${formatCount(counts.members)}${counts.membersMore ? '+' : ''}`
                }
                icon="users"
                tone="peach"
                href="/admin/memberships"
                hint={t('Active members')}
              />
              <Metric
                label={t('Upcoming events')}
                value={formatCount(counts.upcomingEvents)}
                icon="calendar"
                tone="sky"
                href="/admin/events"
                hint={t('From today forward')}
              />
              <Metric
                label={t('Giving (recent)')}
                value={
                  counts.offeringsTotalMinor === null
                    ? '—'
                    : formatMoney(
                        counts.offeringsTotalMinor,
                        counts.offeringsCurrency,
                      )
                }
                icon="wallet"
                tone="sage"
                href="/admin/finance"
                hint={t('Last offerings loaded')}
              />
              <Metric
                label={t('Ministries')}
                value={formatCount(counts.ministries)}
                icon="hand"
                tone="lavender"
                href="/admin/ministries"
                hint={t('Teams and units')}
              />
            </>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Attendance — calm placeholder until series API exists */}
        <div className="min-w-0 lg:col-span-2">
          <Panel
            title={t('Recent attendance')}
            subtitle={t('Total present per service day, last 8 weeks.')}
            linkHref="/admin/attendance"
            linkLabel={t('Attendance')}
          >
            <AttendanceTrend />
          </Panel>
        </div>

        {/* Upcoming events with thumbs */}
        <div className="min-w-0 lg:col-span-3">
          <Panel
            title={t('Upcoming events')}
            subtitle={t('Next gatherings on the calendar')}
            linkHref="/admin/events"
          >
            {loading ? (
              <ListSkeleton rows={3} />
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon="calendar"
                tone="sky"
                title={t('No upcoming services yet')}
                description={t('Schedule a Sunday service or small gathering so people know where to be.')}
                action={
                  <Link
                    href="/admin/events"
                    className={buttonClassName({ variant: 'primary', size: 'sm' })}
                  >
                    <Icon name="plus" size={14} />
                    {t('Add an event')}
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <EventThumb event={ev} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/admin/events/${ev.id}`}
                          className="truncate text-sm font-medium text-foreground hover:text-[color:var(--brand-gold-ink)] focus-ring rounded-sm"
                        >
                          {t(ev.title)}
                        </Link>
                        <StatusPill tone={statusToneForEvent(ev.status)}>
                          {titleCase(ev.status)}
                        </StatusPill>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(ev.serviceDate)}
                        {ev.eventTypeName ? ` · ${ev.eventTypeName}` : ''}
                        {ev.startsAt ? ` · ${formatDateTime(ev.startsAt)}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* Attention strip when approvals exist */}
      {!loading && approvals.length > 0 ? (
        <Panel
          title={t('Needs your attention')}
          subtitle={(counts.pendingApprovals === 1 ? t('{0} pending approval', counts.pendingApprovals) : t('{0} pending approvals', counts.pendingApprovals))}
          linkHref="/admin/approvals"
          linkLabel={t('Review')}
        >
          <ul className="space-y-3">
            {approvals.map((a) => (
              <li key={a.id}>
                <Link
                  href="/admin/approvals"
                  className="block rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:border-foreground/15 hover:bg-surface-muted/50 focus-ring motion-reduce:transition-none"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {titleCase(a.subjectType)} {t('awaiting a second approval')}
                    </p>
                    <StatusPill tone="pending" hideDot>
                      {t('Pending')}
                    </StatusPill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('Submitted')} {formatDate(a.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {/* Ministries CTA — mockup gold-tinted band */}
      <section
        aria-labelledby="dashboard-ministries-cta"
        className="relative overflow-hidden rounded-2xl border border-[color:var(--brand-gold-soft)] bg-[color:var(--brand-gold-tint)]"
      >
        <div className="absolute inset-y-0 right-0 w-2/5 opacity-40 sm:opacity-60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/imagery/faith-hill.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--brand-gold-tint)] to-transparent" />
        </div>
        <div className="relative flex flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-7">
          <div className="max-w-lg">
            <h2
              id="dashboard-ministries-cta"
              className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
            >
              {t('Grow in faith together')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('Explore ministries and help people find where they belong.')}
            </p>
          </div>
          <Link
            href="/admin/ministries"
            className={buttonClassName({ variant: 'primary' })}
          >
            {t('Explore ministries')}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}

function EventThumb({ event }: { event: EventRow }): React.ReactElement {
  if (event.posterUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={event.posterUrl}
        alt=""
        className="mt-0.5 h-12 w-12 shrink-0 rounded-xl object-cover"
      />
    );
  }
  const day = event.serviceDate?.slice(8, 10) ?? '—';
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 inline-flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[color:var(--sky-soft)] text-[color:var(--sky)]"
    >
      <span className="text-[10px] font-semibold uppercase leading-none">{t('Day')}</span>
      <span className="text-base font-semibold tabular-nums leading-tight">{day}</span>
    </span>
  );
}

interface AttendanceDay {
  serviceDate: string;
  totalCount: number;
}

/**
 * Live attendance bars from the R-SP-02 report (day aggregates). Shows a calm
 * empty state rather than an invented chart when nothing is recorded yet.
 */
function AttendanceTrend(): React.ReactElement {
  const [days, setDays] = useState<AttendanceDay[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const since = new Date(Date.now() - 56 * 86_400_000).toISOString().slice(0, 10);
    try {
      const report = await apiFetch<{ data: { days?: AttendanceDay[] } }>(
        `/api/v1/reports/R-SP-02?from=${since}`,
      );
      const rows = (report.data?.days ?? [])
        .filter((d) => d.totalCount > 0)
        .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate))
        .slice(-8);
      setDays(rows);
    } catch {
      setUnavailable(true);
      setDays([]);
    }
  }, []);
  useLoadEffect(load);

  if (days === null) return <Skeleton size="block" />;
  if (days.length === 0) {
    return (
      <EmptyState
        icon="calendar-check"
        tone="sage"
        title={unavailable ? t('Attendance totals unavailable') : t('No attendance recorded yet')}
        description={
          unavailable
            ? t('Your role can’t view the attendance report.')
            : t('Open a session on a service to start counting. Totals appear here after each service.')
        }
      />
    );
  }

  const max = Math.max(...days.map((d) => d.totalCount));
  const latest = days[days.length - 1]!;
  const previous = days.length > 1 ? days[days.length - 2]! : null;
  const change = previous ? latest.totalCount - previous.totalCount : null;

  return (
    <figure className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-3xl font-semibold tabular-nums text-foreground">
          {formatCount(latest.totalCount)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(latest.serviceDate)}
          {change !== null ? (
            <span className={change >= 0 ? 'ml-2 text-[color:var(--success-ink)]' : 'ml-2 text-[color:var(--danger-ink)]'}>
              {change >= 0 ? '+' : ''}
              {formatCount(change)} {t('vs previous')}
            </span>
          ) : null}
        </p>
      </div>
      <div
        aria-hidden="true"
        className="flex h-36 items-end gap-2 rounded-xl bg-surface-muted/60 px-3 pb-2 pt-3"
      >
        {days.map((d, i) => (
          <div key={d.serviceDate} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div
              className={
                i === days.length - 1
                  ? 'w-full rounded-t-md bg-gold-gradient'
                  : 'w-full rounded-t-md bg-[color:var(--brand-gold-soft)]'
              }
              style={{ height: `${Math.max(6, Math.round((d.totalCount / max) * 100))}%` }}
              title={`${formatDate(d.serviceDate)}: ${d.totalCount}`}
            />
          </div>
        ))}
      </div>
      <figcaption className="sr-only">
        {t('Attendance by service day:')}{' '}
        {days.map((d) => `${formatDate(d.serviceDate)} ${d.totalCount}`).join('; ')}.
      </figcaption>
      <div className="flex justify-between text-[11px] text-muted-foreground" aria-hidden="true">
        <span>{formatDate(days[0]!.serviceDate)}</span>
        <span>{formatDate(latest.serviceDate)}</span>
      </div>
    </figure>
  );
}

function countFromEnvelope<T>(
  envelope: (ListEnvelope<T> & { meta?: ListMeta }) | T[],
): number {
  return asList(envelope).length;
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function statusToneForEvent(status: string): 'neutral' | 'info' | 'warning' | 'success' {
  switch (status) {
    case 'draft':
      return 'neutral';
    case 'scheduled':
    case 'published':
      return 'info';
    case 'cancelled':
      return 'warning';
    case 'completed':
      return 'success';
    default:
      return 'neutral';
  }
}

function buildGreeting(name: string | undefined): string {
  const hour = new Date().getHours();
  const timeLabel =
    hour < 5
      ? t('Good evening')
      : hour < 12
        ? t('Good morning')
        : hour < 17
          ? t('Good afternoon')
          : t('Good evening');
  if (!name) return `${timeLabel}`;
  return `${timeLabel}`;
}

function MetricSkeleton(): React.ReactElement {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <Skeleton size="line" className="w-24" />
      <Skeleton size="heading" className="mt-3 w-20" />
      <Skeleton size="line" className="mt-2 w-32" />
    </div>
  );
}

function ListSkeleton({ rows = 3 }: { rows?: number }): React.ReactElement {
  return (
    <ul className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="rounded-xl border border-border bg-surface px-3 py-3">
          <Skeleton size="heading" className="w-1/2" />
          <Skeleton size="line" className="mt-2 w-3/4" />
        </li>
      ))}
    </ul>
  );
}
