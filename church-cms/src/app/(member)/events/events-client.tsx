'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  SearchField,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type { MemberEvent } from '../_shared/api-types';
import {
  formatEventTime,
  formatLongDate,
  formatRelativeToToday,
  todayIso,
} from '../_shared/formatters';

type Filter = 'upcoming' | 'all';

const MONTH_KEYS = [
  'monthJan',
  'monthFeb',
  'monthMar',
  'monthApr',
  'monthMay',
  'monthJun',
  'monthJul',
  'monthAug',
  'monthSep',
  'monthOct',
  'monthNov',
  'monthDec',
] as const;

export function MemberEventsClient(): React.ReactElement {
  const t = useTranslations('MemberEvents');
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [events, setEvents] = useState<MemberEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    // Read the date here, not during render (Cache Components prerender).
    const today = todayIso();
    const url =
      filter === 'upcoming'
        ? `/api/v1/events?from=${today}&limit=50`
        : `/api/v1/events?limit=100`;
    apiFetch<MemberEvent[]>(url)
      .then((data) => {
        if (cancelled) return;
        setEvents(data);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError) {
          setError(e.message || t('loadFailDefault'));
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
  }, [filter, t]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = events ?? [];
    // Event statuses are scheduled / cancelled / completed. Show them all;
    // cancelled ones carry a badge so members aren't caught out.
    const sorted = list
      .slice()
      .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
    if (!q) return sorted;
    return sorted.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.eventTypeName?.toLowerCase().includes(q) ?? false),
    );
  }, [events, search]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('title')} lede={t('lede')} />

      <Tabs
        value={filter}
        onValueChange={(v) => {
          // Reset in the handler, not the fetch effect, to avoid a
          // cascading render.
          setFilter(v as Filter);
          setLoading(true);
          setError(null);
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabList aria-label={t('eventRangeAria')}>
            <Tab value="upcoming">{t('upcoming')}</Tab>
            <Tab value="all">{t('all')}</Tab>
          </TabList>
          <div className="sm:w-72">
            <SearchField
              label={t('searchLabel')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder={t('searchPlaceholder')}
            />
          </div>
        </div>

        <TabPanel value={filter} className="mt-4">
          {loading ? (
            <EventListSkeleton />
          ) : error ? (
            <ErrorCard message={error} />
          ) : visible.length === 0 ? (
            <EmptyState
              icon="calendar"
              tone="sky"
              title={
                filter === 'upcoming' ? t('emptyUpcoming') : t('emptySearch')
              }
              description={
                filter === 'upcoming'
                  ? t('emptyUpcomingBody')
                  : t('emptySearchBody')
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((event) => (
                <li key={event.id}>
                  <EventListCard event={event} />
                </li>
              ))}
            </ul>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}

function EventListCard({ event }: { event: MemberEvent }): React.ReactElement {
  const t = useTranslations('MemberEvents');
  const time = formatEventTime(event.startsAt);
  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex overflow-hidden rounded-card border border-border bg-surface shadow-card transition-colors hover:border-foreground/15 hover:bg-surface-muted/40 focus-ring motion-reduce:transition-none"
    >
      {event.posterUrl ? (
        <div className="hidden w-32 shrink-0 bg-surface-muted sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.posterUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="hidden w-32 shrink-0 items-center justify-center tone-sky sm:flex"
        >
          <Icon name="calendar" size={32} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 items-start gap-3 p-4">
        <div className="flex w-14 shrink-0 flex-col items-center rounded-md border border-border bg-surface px-1 py-1.5 text-center sm:hidden">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {monthShort(event.serviceDate, t)}
          </span>
          <span className="text-lg font-semibold leading-none text-foreground">
            {Number(event.serviceDate.slice(8, 10))}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">
            {event.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span>{formatLongDate(event.serviceDate)}</span>
            {time ? <span> · {time}</span> : null}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {event.status === 'cancelled' ? (
              <Badge tone="peach">{t('cancelled')}</Badge>
            ) : null}
            <Badge tone="sky">{event.eventTypeName ?? t('gathering')}</Badge>
            <Badge tone="neutral">
              {formatRelativeToToday(event.serviceDate)}
            </Badge>
          </div>
        </div>
        <Icon
          name="chevron-right"
          size={18}
          className="mt-1 shrink-0 text-muted-foreground"
        />
      </div>
    </Link>
  );
}

function monthShort(
  iso: string,
  t: ReturnType<typeof useTranslations<'MemberEvents'>>,
): string {
  const m = Number(iso.slice(5, 7));
  const key = MONTH_KEYS[m - 1];
  return key ? t(key) : '';
}

function EventListSkeleton(): React.ReactElement {
  return (
    <ul className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i}>
          <div className="flex gap-3 overflow-hidden rounded-card border border-border bg-surface p-3">
            <Skeleton size="block" className="h-20 w-20" radius="md" />
            <div className="flex-1 space-y-2">
              <Skeleton size="heading" />
              <Skeleton size="line" />
              <Skeleton size="line" className="w-1/3" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ErrorCard({ message }: { message: string }): React.ReactElement {
  const t = useTranslations('MemberEvents');
  return (
    <Card padding="lg" className="flex flex-col items-start gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--danger-ink)]">
        <Icon name="alert-circle" size={16} />
        {t('loadFailTitle')}
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button
        variant="secondary"
        iconLeft="refresh"
        onClick={() => window.location.reload()}
      >
        {t('tryAgain')}
      </Button>
    </Card>
  );
}
