'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  buttonClassName,
  Card,
  CardHeader,
  CardTitle,
  PageHeader,
  Panel,
  Skeleton,
  StatusPill,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type { EventRow, EventType } from '../../../_lib/api-types';
import { formatDate, formatDateTime, titleCase } from '../../../_lib/format';
import { asList } from '../../../_lib/list';
import type { AttendanceSession } from '../../attendance/attendance-types';
import { ManageSessionDialog } from '../../attendance/manage-session-dialog';
import { OpenSessionDialog } from '../../attendance/open-session-dialog';
import { EditEventDialog } from '../edit-event-dialog';
import { PosterImage } from '../poster-image';

interface EventDetailClientProps {
  eventId: string;
}

export function EventDetailClient({
  eventId,
}: EventDetailClientProps): React.ReactElement {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [types, setTypes] = useState<EventType[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [openSessionOpen, setOpenSessionOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(
    null,
  );

  const loadSessions = useCallback(async (): Promise<void> => {
    setSessionsError(null);
    try {
      const payload = await apiFetch<
        AttendanceSession[] | { data: AttendanceSession[] }
      >(`/api/v1/events/${eventId}/attendance-sessions`);
      setSessions(asList(payload));
    } catch (err) {
      setSessions([]);
      setSessionsError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load attendance sessions.',
      );
    }
  }, [eventId]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [data, typeList] = await Promise.all([
        apiFetch<EventRow>(`/api/v1/events/${eventId}`),
        apiFetch<EventType[]>('/api/v1/event-types'),
      ]);
      setEvent(data);
      setTypes(Array.isArray(typeList) ? typeList : []);
      await loadSessions();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load this event.',
      );
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, loadSessions]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !event) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton size="heading" className="w-64" />
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Skeleton size="block" className="aspect-[3/4] h-auto" />
          <div>
            <Skeleton size="line" className="w-1/3" />
            <Skeleton size="line" className="mt-2 w-1/2" />
            <Skeleton size="block" className="mt-4" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={
            <Link
              href="/admin/events"
              className="inline-flex items-center gap-1 text-foreground hover:text-[color:var(--brand-gold-ink)]"
            >
              <Icon name="arrow-left" size={14} />
              Back to events
            </Link>
          }
          title="Event not found"
          lede={error ?? 'This event may have been removed.'}
          actions={
            <Link
              href="/admin/events"
              className={buttonClassName({ variant: 'secondary' })}
            >
              Back to list
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link
            href="/admin/events"
            className="inline-flex items-center gap-1 text-foreground hover:text-[color:var(--brand-gold-ink)]"
          >
            <Icon name="arrow-left" size={14} />
            Back to events
          </Link>
        }
        title={event.title}
        lede={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{formatDate(event.serviceDate)}</span>
            {event.eventTypeName ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{event.eventTypeName}</span>
              </>
            ) : null}
          </span>
        }
        actions={
          <>
            <Button
              variant="secondary"
              iconLeft="edit"
              onClick={() => setEditOpen(true)}
            >
              Edit
            </Button>
            <StatusPill tone={statusTone(event.status)}>
              {titleCase(event.status)}
            </StatusPill>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="aspect-[3/4] w-full">
            <PosterImage
              url={event.posterUrl}
              alt={`${event.title} poster`}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <Badge tone="neutral">{titleCase(event.status)}</Badge>
            </CardHeader>
            <dl className="space-y-3 text-sm">
              <Row label="Service date" value={formatDate(event.serviceDate)} />
              <Row
                label="Starts at"
                value={event.startsAt ? formatDateTime(event.startsAt) : '—'}
              />
              <Row
                label="Ends at"
                value={event.endsAt ? formatDateTime(event.endsAt) : '—'}
              />
              <Row
                label="Type"
                value={event.eventTypeName ?? event.eventTypeCode ?? '—'}
              />
            </dl>
          </Card>

          <Panel title="Description">
            {event.description ? (
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No description provided.
              </p>
            )}
          </Panel>

          <Panel
            title="Attendance"
            subtitle="Open a session, record who came, then finalize."
          >
            {sessionsError ? (
              <div
                role="alert"
                className="mb-3 rounded-md border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--danger-ink)]"
              >
                {sessionsError}
              </div>
            ) : null}
            {sessions.length === 0 ? (
              <p className="mb-3 text-sm text-muted-foreground">
                No attendance sessions yet for this event.
              </p>
            ) : (
              <ul className="mb-3 divide-y divide-border rounded-md border border-border">
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill
                        tone={s.status === 'open' ? 'info' : 'success'}
                      >
                        {titleCase(s.status)}
                      </StatusPill>
                      <span className="text-muted-foreground">
                        {titleCase(s.mode.replaceAll('_', ' '))}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {s.recordCount ?? 0}{' '}
                        {(s.recordCount ?? 0) === 1 ? 'record' : 'records'}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActiveSession(s);
                        setManageOpen(true);
                      }}
                    >
                      {s.status === 'open' ? 'Continue' : 'View'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                iconLeft="calendar-check"
                onClick={() => setOpenSessionOpen(true)}
              >
                Open session
              </Button>
              <Link
                href="/admin/attendance"
                className={buttonClassName({ variant: 'secondary', size: 'sm' })}
              >
                Attendance overview
              </Link>
            </div>
          </Panel>
        </div>
      </div>

      <EditEventDialog
        open={editOpen}
        event={event}
        types={types}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setEvent(updated);
          setEditOpen(false);
        }}
      />

      <OpenSessionDialog
        open={openSessionOpen}
        events={[event]}
        presetEventId={event.id}
        onClose={() => setOpenSessionOpen(false)}
        onOpened={(session) => {
          setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
          setActiveSession(session);
          setManageOpen(true);
        }}
      />

      <ManageSessionDialog
        open={manageOpen}
        session={activeSession}
        eventTitle={event.title}
        onClose={() => {
          setManageOpen(false);
          void loadSessions();
        }}
        onChanged={(session) => {
          setActiveSession(session);
          setSessions((prev) =>
            prev.map((s) => (s.id === session.id ? session : s)),
          );
        }}
      />
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-right text-sm text-foreground">{value}</dd>
    </div>
  );
}

function statusTone(
  status: string,
): 'neutral' | 'info' | 'warning' | 'success' {
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
