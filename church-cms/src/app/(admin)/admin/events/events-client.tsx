'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Button,
  EmptyState,
  PageHeader,
  Panel,
  Skeleton,
  StatusPill,
} from '@/app/_ekklesia/ui';
import type { EventRow, EventType } from '../../_lib/api-types';
import { formatDate, titleCase } from '../../_lib/format';
import { CreateEventDialog } from './create-event-dialog';
import { PosterImage } from './poster-image';

/**
 * Events list — replaces the legacy `src/app/events/events-admin.tsx` page.
 *
 * Preserves the pilot's core workflow: list events, create a new one with
 * optional poster upload, open a card to see the poster full-size. Now wired
 * through the shared `apiFetch` helper (dev-auth lives in one place) and the
 * Ekklesia primitives (no inline global styles, no raw hex).
 */
export function EventsClient(): React.ReactElement {
  const [types, setTypes] = useState<EventType[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [typeList, eventList] = await Promise.all([
        apiFetch<EventType[]>('/api/v1/event-types'),
        apiFetch<EventRow[]>('/api/v1/events?limit=50'),
      ]);
      // apiFetch unwraps `{ data }` envelopes automatically.
      setTypes(Array.isArray(typeList) ? typeList : []);
      setEvents(Array.isArray(eventList) ? eventList : []);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load events',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Events"
        lede="Schedule Sunday services and gatherings, attach a poster, and open any card for the full-size view."
        actions={
          <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
            New event
          </Button>
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--danger-ink)]"
        >
          {error}
        </div>
      ) : null}

      <Panel
        title="Upcoming and recent"
        subtitle="Most recent first."
        actions={
          <Button
            variant="secondary"
            size="sm"
            iconLeft="refresh"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      >
        {loading && events.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon="calendar"
            tone="sky"
            title="No events yet"
            description="Add your first Sunday service or gathering to get started."
            action={
              <Button
                size="sm"
                iconLeft="plus"
                onClick={() => setCreateOpen(true)}
              >
                New event
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => (
              <li key={ev.id}>
                <EventCard event={ev} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <CreateEventDialog
        open={createOpen}
        types={types}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          setCreateOpen(false);
          void load();
          // Scroll to new event? For now simply refresh; the card appears
          // at the top (serviceDate desc).
          void created;
        }}
      />
    </div>
  );
}

function EventCard({ event }: { event: EventRow }): React.ReactElement {
  return (
    <Link
      href={`/admin/events/${event.id}`}
      className="group block overflow-hidden rounded-card border border-border bg-surface shadow-card transition-colors hover:border-foreground/15 focus-ring"
    >
      <div className="aspect-[4/3] w-full bg-surface-muted">
        <PosterImage
          url={event.posterUrl}
          alt={`${event.title} poster`}
          className="h-full w-full object-cover"
          emptyIcon="image"
        />
      </div>
      <div className="flex items-start justify-between gap-2 border-t border-border p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {event.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(event.serviceDate)}
            {event.eventTypeName ? ` · ${event.eventTypeName}` : ''}
          </p>
        </div>
        <StatusPill tone={statusTone(event.status)}>
          {titleCase(event.status)}
        </StatusPill>
      </div>
    </Link>
  );
}

function EventCardSkeleton(): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <Skeleton size="block" className="aspect-[4/3] h-auto rounded-none" />
      <div className="border-t border-border p-4">
        <Skeleton size="heading" className="w-3/4" />
        <Skeleton size="line" className="mt-2 w-1/2" />
      </div>
    </div>
  );
}

function statusTone(
  status: string,
): 'neutral' | 'info' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'draft':
      return 'neutral';
    case 'scheduled':
    case 'published':
      return 'info';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'warning';
    default:
      return 'neutral';
  }
}
