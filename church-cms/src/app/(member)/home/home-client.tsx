'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, useSession } from '@/app/_ekklesia/session';
import {
  Badge,
  EmptyState,
  Skeleton,
  buttonClassName,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type {
  MemberAnnouncement,
  MemberEvent,
  MemberParticipationRequest,
  MemberPledge,
} from '../_shared/api-types';
import { pickDevotionalFor } from '../_shared/devotional';
import {
  firstName,
  formatEventTime,
  formatServiceDate,
  timeOfDayGreeting,
  todayIso,
} from '../_shared/formatters';

interface HomeData {
  events: MemberEvent[];
  announcements: MemberAnnouncement[];
  participations: MemberParticipationRequest[];
  pledges: MemberPledge[];
  errors: Partial<Record<'events' | 'announcements' | 'participations' | 'pledges', string>>;
}

const EMPTY_DATA: HomeData = {
  events: [],
  announcements: [],
  participations: [],
  pledges: [],
  errors: {},
};

/**
 * Member home — mockup composition: greeting, featured worship card,
 * pastel quick actions, daily verse. Live API only.
 */
export function HomeClient(): React.ReactElement {
  const { user, church, loading: sessionLoading } = useSession();
  const [data, setData] = useState<HomeData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => todayIso(), []);
  const devotional = useMemo(() => pickDevotionalFor(today), [today]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [eventsRes, announcementsRes, participationsRes, pledgesRes] =
        await Promise.allSettled([
          apiFetch<MemberEvent[]>(`/api/v1/events?from=${today}&limit=5`),
          apiFetch<MemberAnnouncement[]>('/api/v1/announcements'),
          apiFetch<MemberParticipationRequest[]>(
            '/api/v1/participation-requests/me?limit=10',
          ),
          apiFetch<MemberPledge[]>('/api/v1/pledges/unpaid?limit=5'),
        ]);
      if (cancelled) return;

      const nextErrors: HomeData['errors'] = {};
      const events = extract(eventsRes, (e) => (nextErrors.events = e));
      const announcements = extract(
        announcementsRes,
        (e) => (nextErrors.announcements = e),
      );
      const participations = extract(
        participationsRes,
        (e) => (nextErrors.participations = e),
      );
      const pledges = extract(pledgesRes, (e) => (nextErrors.pledges = e));

      setData({
        events: events ?? [],
        announcements: (announcements ?? []).filter((a) => a.status === 'published'),
        participations: participations ?? [],
        pledges: pledges ?? [],
        errors: nextErrors,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [today]);

  const greetingName = firstName(user?.displayName);
  const greeting = timeOfDayGreeting();
  const churchName = church?.name ?? 'your church';
  const featured = data.events[0] ?? null;
  const unpaidPledgeCount = data.pledges.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting — mockup mobile first */}
      <section aria-labelledby="home-greeting" className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {sessionLoading ? 'Loading…' : churchName}
        </p>
        <h1
          id="home-greeting"
          className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          {greeting},{' '}
          <span className="text-[color:var(--brand-gold-ink)]">{greetingName}</span>
          !
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stay connected, grow, and serve.
        </p>
      </section>

      {/* Featured worship / next event — dark photo card */}
      {loading ? (
        <FeaturedSkeleton />
      ) : featured ? (
        <FeaturedEventCard event={featured} />
      ) : (
        <EmptyState
          icon="calendar"
          tone="sky"
          title="Nothing featured yet"
          description="When your church posts the next service, it will appear here."
          action={
            <Link href="/events" className={buttonClassName({ size: 'sm' })}>
              Browse events
            </Link>
          }
        />
      )}

      {/* Quick actions — Groups / Events / Giving / Sermons (devotionals) */}
      <section aria-labelledby="home-quick-actions">
        <h2 id="home-quick-actions" className="sr-only">
          Quick actions
        </h2>
        <div className="grid grid-cols-4 gap-3">
          <QuickAction href="/community" icon="users" label="Groups" tone="peach" />
          <QuickAction href="/events" icon="calendar" label="Events" tone="sky" />
          <QuickAction
            href="/giving"
            icon="hand"
            label="Giving"
            tone="sage"
            badge={unpaidPledgeCount > 0 ? String(unpaidPledgeCount) : undefined}
          />
          <QuickAction href="/home#devotional" icon="book" label="Sermons" tone="lavender" />
        </div>
      </section>

      {/* Daily verse — champagne tint + Fraunces */}
      <section aria-labelledby="home-devotional" id="devotional">
        <article className="rounded-2xl border border-[color:var(--brand-gold-soft)] bg-[color:var(--brand-gold-tint)] p-6 sm:p-7">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[color:var(--brand-gold-ink)]">
            <Icon name="book" size={14} />
            <span>Daily verse</span>
          </div>
          <h2 id="home-devotional" className="sr-only">
            Daily verse
          </h2>
          <blockquote className="scripture mt-3 text-lg text-foreground sm:text-xl">
            &ldquo;{devotional.quote}&rdquo;
          </blockquote>
          {devotional.attribution ? (
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {devotional.attribution}
            </p>
          ) : null}
          {devotional.thought ? (
            <p className="mt-4 text-sm text-foreground/90">{devotional.thought}</p>
          ) : null}
        </article>
      </section>
    </div>
  );
}

function FeaturedEventCard({ event }: { event: MemberEvent }): React.ReactElement {
  const time = formatEventTime(event.startsAt);
  const imageSrc = event.posterUrl || '/brand/imagery/worship-cross.jpg';
  return (
    <article className="relative overflow-hidden rounded-2xl shadow-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--surface-inverse)] via-[color:var(--surface-inverse)]/55 to-transparent" />
      <div className="relative flex min-h-[14rem] flex-col justify-end gap-3 p-5 sm:min-h-[16rem] sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">
          Up next · {formatServiceDate(event.serviceDate)}
          {time ? ` · ${time}` : null}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {event.title}
        </h2>
        {event.eventTypeName ? (
          <p className="text-sm text-white/75">{event.eventTypeName}</p>
        ) : null}
        <div className="mt-1 flex items-center justify-between gap-3">
          <Link
            href={`/events/${event.id}`}
            className={buttonClassName({ variant: 'secondary', size: 'sm' })}
          >
            View details
          </Link>
          <Link
            href={`/events/${event.id}`}
            aria-label="Open event"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gold-gradient text-[color:var(--sidebar-active-foreground)] shadow-card focus-ring"
          >
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function FeaturedSkeleton(): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <Skeleton size="block" className="h-52 w-full" radius="sm" />
    </div>
  );
}

const TILE_TONE: Record<'sage' | 'sky' | 'lavender' | 'peach' | 'gold', string> = {
  sage: 'tone-sage',
  sky: 'tone-sky',
  lavender: 'tone-lavender',
  peach: 'tone-peach',
  gold: 'tone-gold',
};

function QuickAction({
  href,
  icon,
  label,
  tone,
  badge,
}: {
  href: string;
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  tone: 'sage' | 'sky' | 'lavender' | 'peach' | 'gold';
  badge?: string;
}): React.ReactElement {
  return (
    <Link
      href={href}
      className="group relative flex flex-col items-center gap-2 rounded-2xl p-2 text-center focus-ring"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-14 w-14 items-center justify-center rounded-2xl ${TILE_TONE[tone]}`}
      >
        <Icon name={icon} size={22} />
        {badge ? (
          <Badge tone="gold" className="absolute -right-1 -top-1 px-1.5 py-0 text-[10px]">
            {badge}
          </Badge>
        ) : null}
      </span>
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </Link>
  );
}

function extract<T>(
  res: PromiseSettledResult<T>,
  onError: (message: string) => void,
): T | undefined {
  if (res.status === 'fulfilled') return res.value;
  const reason = res.reason;
  if (reason instanceof ApiError) {
    if (reason.status === 403 || reason.status === 404) return undefined;
    onError(reason.message);
  } else if (reason instanceof Error) {
    onError(reason.message);
  } else {
    onError('Something went wrong.');
  }
  return undefined;
}
