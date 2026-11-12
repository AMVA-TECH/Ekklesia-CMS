'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError, useSession } from '@/app/_ekklesia/session';
import {
  buttonClassName,
  EmptyState,
  Metric,
  Panel,
  Skeleton,
  StatusPill,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type {
  Announcement,
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

interface DashboardCounts {
  people: number | null;
  members: number | null;
  ministries: number | null;
  pendingApprovals: number | null;
  offeringsTotalMinor: number | null;
  offeringsCurrency: string;
  upcomingEvents: number | null;
}

const EMPTY_COUNTS: DashboardCounts = {
  people: null,
  members: null,
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
        '/api/v1/memberships?status=member&limit=1',
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
      apiFetch<Announcement[] | { data: Announcement[] }>('/api/v1/announcements'),
      apiFetch<Offering[] | { data: Offering[] }>('/api/v1/offerings?limit=30'),
    ]);

    const [
      peopleRes,
      membersRes,
      ministriesRes,
      approvalsRes,
      eventsRes,
      _announcementsRes,
      offeringsRes,
    ] = results;

    const nextCounts: DashboardCounts = { ...EMPTY_COUNTS };

    if (peopleRes.status === 'fulfilled') {
      nextCounts.people = countFromEnvelope(peopleRes.value);
    }
    if (membersRes.status === 'fulfilled') {
      nextCounts.members = countFromEnvelope(membersRes.value);
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
            : 'Could not reach the backend.',
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const [greeting, setGreeting] = useState('Welcome');
  useEffect(() => {
    setGreeting(buildGreeting(user?.displayName));
  }, [user?.displayName]);

  const churchLabel = church?.name ?? 'your church';
  const firstName = user?.displayName?.split(/[\s@]/)[0];

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
            Here&apos;s what&apos;s happening at {churchLabel}.
          </p>
          <div className="mt-2">
            <Link
              href="/admin/events"
              className={buttonClassName({ variant: 'primary', size: 'sm' })}
            >
              <Icon name="plus" size={14} />
              New service
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
          Key numbers
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
                label="Members"
                value={formatCount(counts.members ?? counts.people)}
                icon="users"
                tone="peach"
                href="/admin/memberships"
                hint="Active in your directory"
              />
              <Metric
                label="Upcoming events"
                value={formatCount(counts.upcomingEvents)}
                icon="calendar"
                tone="sky"
                href="/admin/events"
                hint="From today forward"
              />
              <Metric
                label="Giving (recent)"
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
                hint="Last offerings loaded"
              />
              <Metric
                label="Ministries"
                value={formatCount(counts.ministries)}
                icon="hand"
                tone="lavender"
                href="/admin/ministries"
                hint="Teams and units"
              />
            </>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Attendance — calm placeholder until series API exists */}
        <div className="lg:col-span-2">
          <Panel
            title="This month&apos;s attendance"
            subtitle="Live monthly series will appear here when available."
          >
            <AttendancePlaceholder />
          </Panel>
        </div>

        {/* Upcoming events with thumbs */}
        <div className="lg:col-span-3">
          <Panel
            title="Upcoming events"
            subtitle="Next gatherings on the calendar"
            linkHref="/admin/events"
          >
            {loading ? (
              <ListSkeleton rows={3} />
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon="calendar"
                tone="sky"
                title="No upcoming services yet"
                description="Schedule a Sunday service or small gathering so people know where to be."
                action={
                  <Link
                    href="/admin/events"
                    className={buttonClassName({ variant: 'primary', size: 'sm' })}
                  >
                    <Icon name="plus" size={14} />
                    Add an event
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
                          {ev.title}
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
          title="Needs your attention"
          subtitle={`${counts.pendingApprovals} pending approval${counts.pendingApprovals === 1 ? '' : 's'}`}
          linkHref="/admin/memberships"
          linkLabel="Review"
        >
          <ul className="space-y-3">
            {approvals.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-border bg-surface px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {titleCase(a.subjectType)}
                  </p>
                  <StatusPill tone="pending" hideDot>
                    Pending
                  </StatusPill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Opened {formatDate(a.createdAt)}
                </p>
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
              Grow in faith together
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore ministries and help people find where they belong.
            </p>
          </div>
          <Link
            href="/admin/ministries"
            className={buttonClassName({ variant: 'primary' })}
          >
            Explore ministries
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
      <span className="text-[10px] font-semibold uppercase leading-none">Day</span>
      <span className="text-base font-semibold tabular-nums leading-tight">{day}</span>
    </span>
  );
}

function AttendancePlaceholder(): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Attendance trends will chart here once monthly totals are available from
        the API. Until then, this space stays calm — no invented numbers.
      </p>
      <div
        aria-hidden="true"
        className="flex h-36 items-end gap-2 rounded-xl bg-surface-muted/60 px-3 py-3"
      >
        {[40, 55, 48, 70, 62, 85].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-gold-gradient opacity-40"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Placeholder silhouette only</p>
    </div>
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
      ? 'Good evening'
      : hour < 12
        ? 'Good morning'
        : hour < 17
          ? 'Good afternoon'
          : 'Good evening';
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
