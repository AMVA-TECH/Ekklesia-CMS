'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
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
import type { EventRow } from '../../_lib/api-types';
import { formatCount, formatDate, titleCase } from '../../_lib/format';
import { asList } from '../../_lib/list';
import type { AttendanceSession } from './attendance-types';
import { ManageSessionDialog } from './manage-session-dialog';
import { OpenSessionDialog } from './open-session-dialog';

interface LeadershipStatsEnvelope {
  people: Array<{
    personId: string;
    displayName: string;
    presentCount: number;
    sessionsHeld: number;
    rate: number | null;
    band: string;
  }>;
}

/**
 * Attendance landing page.
 *
 * Reads recent event sessions for totals and leadership habits, and offers a
 * calm write path: open a session, record people or headcount, then finalize.
 */
export function AttendanceClient(): React.ReactElement {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [sessionsByEvent, setSessionsByEvent] = useState<
    Record<string, AttendanceSession[]>
  >({});
  const [stats, setStats] = useState<LeadershipStatsEnvelope | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openSessionOpen, setOpenSessionOpen] = useState(false);
  const [presetEventId, setPresetEventId] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(
    null,
  );
  const [activeEventTitle, setActiveEventTitle] = useState('');

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setStatsError(null);
    try {
      const list = await apiFetch<EventRow[]>('/api/v1/events?limit=20');
      const eventList = Array.isArray(list) ? list : [];
      setEvents(eventList);

      const sessionsResults = await Promise.allSettled(
        eventList.slice(0, 10).map(async (ev) => {
          const payload = await apiFetch<
            AttendanceSession[] | { data: AttendanceSession[] }
          >(`/api/v1/events/${ev.id}/attendance-sessions`);
          return [ev.id, asList(payload)] as const;
        }),
      );
      const map: Record<string, AttendanceSession[]> = {};
      for (const result of sessionsResults) {
        if (result.status === 'fulfilled') {
          const [id, sessions] = result.value;
          map[id] = sessions;
        }
      }
      setSessionsByEvent(map);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load attendance.',
      );
    } finally {
      setLoading(false);
    }

    try {
      const data = await apiFetch<LeadershipStatsEnvelope>(
        '/api/v1/attendance/stats/leadership',
      );
      setStats(data);
    } catch (err) {
      setStats(null);
      setStatsError(
        err instanceof ApiError && err.status === 403
          ? 'Leadership attendance insights require a leadership role.'
          : err instanceof Error
            ? err.message
            : 'Leadership attendance unavailable.',
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upsertSessionLocally = useCallback(
    (session: AttendanceSession): void => {
      setSessionsByEvent((prev) => {
        const existing = prev[session.eventId] ?? [];
        const idx = existing.findIndex((s) => s.id === session.id);
        const next =
          idx >= 0
            ? existing.map((s, i) => (i === idx ? session : s))
            : [session, ...existing];
        return { ...prev, [session.eventId]: next };
      });
      setActiveSession(session);
    },
    [],
  );

  const openManage = (session: AttendanceSession, eventTitle: string): void => {
    setActiveSession(session);
    setActiveEventTitle(eventTitle);
    setManageOpen(true);
  };

  const startOpenSession = (eventId?: string): void => {
    setPresetEventId(eventId ?? null);
    setOpenSessionOpen(true);
  };

  const totals = aggregateTotals(sessionsByEvent);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance"
        lede="How many showed up to recent services, and who among your leaders might need a nudge."
        actions={
          <>
            <Button
              variant="primary"
              iconLeft="calendar-check"
              onClick={() => startOpenSession()}
              disabled={events.length === 0}
            >
              Record attendance
            </Button>
            <Link
              href="/admin/events"
              className={buttonClassName({ variant: 'secondary' })}
            >
              <Icon name="calendar" size={14} />
              Open events
            </Link>
          </>
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

      <section aria-labelledby="attendance-totals">
        <h2 id="attendance-totals" className="sr-only">
          Recent attendance totals
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Recent total"
            value={formatCount(totals.total)}
            icon="users"
            tone="sage"
            hint="All sessions in view"
          />
          <Metric
            label="Adults"
            value={formatCount(totals.adults)}
            icon="user"
            tone="sky"
          />
          <Metric
            label="Children"
            value={formatCount(totals.children)}
            icon="users"
            tone="lavender"
          />
          <Metric
            label="Visitors"
            value={formatCount(totals.visitors)}
            icon="user-plus"
            tone="peach"
            hint="Not yet members"
          />
        </div>
      </section>

      <Panel
        title="Recent services"
        subtitle="Open a session to record attendance, then finalize when the gathering is done."
        linkHref="/admin/events"
      >
        {loading && events.length === 0 ? (
          <div className="space-y-3">
            <Skeleton size="block" />
            <Skeleton size="block" />
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon="calendar-check"
            tone="sky"
            title="No recent attendance"
            description="Create an event first, then open an attendance session from here."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Event</TH>
                  <TH>Date</TH>
                  <TH>Sessions</TH>
                  <TH>Men</TH>
                  <TH>Women</TH>
                  <TH>Children</TH>
                  <TH>Visitors</TH>
                  <TH>Total</TH>
                  <TH>Action</TH>
                </TR>
              </THead>
              <TBody>
                {events.map((ev) => {
                  const sessions = sessionsByEvent[ev.id] ?? [];
                  const rowTotals = aggregateTotalsForSessions(sessions);
                  const openSession = sessions.find((s) => s.status === 'open');
                  return (
                    <TR key={ev.id}>
                      <TD>
                        <Link
                          href={`/admin/events/${ev.id}`}
                          className="font-medium text-foreground hover:text-[color:var(--brand-gold-ink)] focus-ring rounded-sm"
                        >
                          {ev.title}
                        </Link>
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {formatDate(ev.serviceDate)}
                      </TD>
                      <TD>
                        <Badge
                          tone={sessions.length > 0 ? 'sage' : 'neutral'}
                        >
                          {sessions.length}
                        </Badge>
                      </TD>
                      <TD className="tabular-nums">{rowTotals.men}</TD>
                      <TD className="tabular-nums">{rowTotals.women}</TD>
                      <TD className="tabular-nums">{rowTotals.children}</TD>
                      <TD className="tabular-nums">{rowTotals.visitors}</TD>
                      <TD className="font-medium tabular-nums">
                        {rowTotals.total}
                      </TD>
                      <TD>
                        {openSession ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openManage(openSession, ev.title)}
                          >
                            Continue
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startOpenSession(ev.id)}
                          >
                            Open session
                          </Button>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <Panel
        title="Leadership attendance"
        subtitle="How consistently each leader is showing up."
      >
        {statsError ? (
          <div className="rounded-md border border-[color:var(--warning-soft)] bg-[color:var(--warning-soft)] px-3 py-2 text-sm text-[color:var(--warning-ink)]">
            {statsError}
          </div>
        ) : !stats ? (
          <Skeleton size="block" />
        ) : stats.people.length === 0 ? (
          <EmptyState
            icon="chart"
            tone="sage"
            title="No leaders to compare"
            description="Leadership attendance insights appear once leaders have assignments and attendance history."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Leader</TH>
                  <TH>Sessions attended</TH>
                  <TH>Rate</TH>
                  <TH>Band</TH>
                </TR>
              </THead>
              <TBody>
                {stats.people.slice(0, 15).map((p) => (
                  <TR key={p.personId}>
                    <TD>
                      <Link
                        href={`/admin/people/${p.personId}`}
                        className="font-medium text-foreground hover:text-[color:var(--brand-gold-ink)] focus-ring rounded-sm"
                      >
                        {p.displayName}
                      </Link>
                    </TD>
                    <TD className="tabular-nums">
                      {p.presentCount} / {p.sessionsHeld}
                    </TD>
                    <TD className="tabular-nums">
                      {p.rate === null ? '—' : `${Math.round(p.rate * 100)}%`}
                    </TD>
                    <TD>
                      <StatusPill tone={bandTone(p.band)}>
                        {titleCase(p.band)}
                      </StatusPill>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <OpenSessionDialog
        open={openSessionOpen}
        events={events}
        presetEventId={presetEventId}
        onClose={() => {
          setOpenSessionOpen(false);
          setPresetEventId(null);
        }}
        onOpened={(session, event) => {
          upsertSessionLocally(session);
          openManage(session, event.title);
        }}
      />

      <ManageSessionDialog
        open={manageOpen}
        session={activeSession}
        eventTitle={activeEventTitle}
        onClose={() => {
          setManageOpen(false);
          void load();
        }}
        onChanged={upsertSessionLocally}
      />
    </div>
  );
}

function aggregateTotalsForSessions(
  sessions: readonly AttendanceSession[],
): {
  men: number;
  women: number;
  children: number;
  visitors: number;
  total: number;
} {
  const out = { men: 0, women: 0, children: 0, visitors: 0, total: 0 };
  for (const s of sessions) {
    if (!s.summary) continue;
    out.men += s.summary.menCount;
    out.women += s.summary.womenCount;
    out.children += s.summary.childrenCount;
    out.visitors += s.summary.visitorsCount;
    out.total += s.summary.totalCount;
  }
  return out;
}

function aggregateTotals(
  map: Record<string, readonly AttendanceSession[]>,
): {
  total: number;
  adults: number;
  children: number;
  visitors: number;
} {
  let total = 0;
  let adults = 0;
  let children = 0;
  let visitors = 0;
  for (const sessions of Object.values(map)) {
    for (const s of sessions) {
      if (!s.summary) continue;
      total += s.summary.totalCount;
      adults += s.summary.menCount + s.summary.womenCount;
      children += s.summary.childrenCount;
      visitors += s.summary.visitorsCount;
    }
  }
  return { total, adults, children, visitors };
}

function bandTone(
  band: string,
): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (band) {
    case 'strong':
    case 'consistent':
      return 'success';
    case 'drifting':
      return 'warning';
    case 'at_risk':
      return 'danger';
    case 'new':
      return 'info';
    default:
      return 'neutral';
  }
}
