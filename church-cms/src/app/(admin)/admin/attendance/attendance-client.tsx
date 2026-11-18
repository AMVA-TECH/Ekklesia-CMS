'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
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
import { useTranslations } from 'next-intl';

interface LeadershipStatsEnvelope {
  people: Array<{
    personId: string;
    displayName: string;
    presentCount: number;
    sessionsHeld: number;
    rate: number | null;
    band: string;
    suggestedNudge?: 'congratulate' | 'encourage' | 'remind' | null;
  }>;
}

/**
 * Attendance landing page.
 *
 * Reads recent event sessions for totals and leadership habits, and offers a
 * calm write path: open a session, record people or headcount, then finalize.
 */
export function AttendanceClient(): React.ReactElement {
  const ta = useTranslations('AdminAttendance');
  const t = useTranslations('AdminPages');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [sessionsByEvent, setSessionsByEvent] = useState<
    Record<string, AttendanceSession[]>
  >({});
  const [stats, setStats] = useState<LeadershipStatsEnvelope | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [followUpOnly, setFollowUpOnly] = useState(false);
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
            : ta('unableLoad'),
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
          ? ta('leadershipRequireRole')
          : err instanceof Error
            ? err.message
            : ta('leadershipUnavailable'),
      );
    }
  }, [ta]);

  useLoadEffect(load);

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
        title={t('attendance')}
        lede={t('attendanceLede')}
        actions={
          <>
            <Link
              href="/admin/attendance/absences"
              className={buttonClassName({ variant: 'secondary' })}
            >
              {ta('absenceNotices')}
            </Link>
            <Link
              href="/admin/attendance/corrections"
              className={buttonClassName({ variant: 'secondary' })}
            >
              {ta('corrections')}
            </Link>
            <Button
              variant="primary"
              iconLeft="calendar-check"
              onClick={() => startOpenSession()}
              disabled={events.length === 0}
            >
              {ta('recordAttendance')}
            </Button>
            <Link
              href="/admin/events"
              className={buttonClassName({ variant: 'secondary' })}
            >
              <Icon name="calendar" size={14} />
              {ta('openEvents')}
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
          {ta('recentTotalsAria')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label={ta('recentTotal')}
            value={formatCount(totals.total)}
            icon="users"
            tone="sage"
            hint={ta('allSessionsInView')}
          />
          <Metric
            label={ta('adults')}
            value={formatCount(totals.adults)}
            icon="user"
            tone="sky"
          />
          <Metric
            label={ta('children')}
            value={formatCount(totals.children)}
            icon="users"
            tone="lavender"
          />
          <Metric
            label={ta('visitors')}
            value={formatCount(totals.visitors)}
            icon="user-plus"
            tone="peach"
            hint={ta('notYetMembers')}
          />
        </div>
      </section>

      <Panel
        title={ta('recentServices')}
        subtitle={ta('recentServicesSubtitle')}
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
            title={ta('noRecent')}
            description={ta('noRecentBody')}
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{ta('event')}</TH>
                  <TH>{ta('date')}</TH>
                  <TH>{ta('sessions')}</TH>
                  <TH>{ta('men')}</TH>
                  <TH>{ta('women')}</TH>
                  <TH>{ta('children')}</TH>
                  <TH>{ta('visitors')}</TH>
                  <TH>{ta('total')}</TH>
                  <TH>{ta('action')}</TH>
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
                        <div className="flex flex-wrap gap-2">
                          {openSession &&
                          (openSession.mode === 'qr_mixed' ||
                            openSession.mode === 'roll_call') ? (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => openManage(openSession, ev.title)}
                            >
                              {ta('showQr')}
                            </Button>
                          ) : openSession ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openManage(openSession, ev.title)}
                            >
                              {ta('continue')}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startOpenSession(ev.id)}
                            >
                              {ta('openPlusQr')}
                            </Button>
                          )}
                        </div>
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
        title={ta('leadershipAttendance')}
        subtitle={ta('leadershipSubtitleNudge')}
        actions={
          stats && stats.people.length > 0 ? (
            <Button
              size="sm"
              variant={followUpOnly ? 'primary' : 'secondary'}
              aria-pressed={followUpOnly}
              onClick={() => setFollowUpOnly((v) => !v)}
            >
              {followUpOnly ? ta('showingFollowUps') : ta('needsFollowUpOnly')}
            </Button>
          ) : null
        }
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
            title={ta('noLeaders')}
            description={ta('noLeadersBody')}
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{ta('leader')}</TH>
                  <TH>{ta('sessionsAttended')}</TH>
                  <TH>{ta('rate')}</TH>
                  <TH>{ta('band')}</TH>
                  <TH>{ta('suggestedFollowUp')}</TH>
                </TR>
              </THead>
              <TBody>
                {stats.people
                  .filter((p) => !followUpOnly || p.band === 'irregular' || p.band === 'missing')
                  .slice(0, followUpOnly ? 50 : 15)
                  .map((p) => (
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
                    <TD className="text-sm">
                      {p.suggestedNudge ? (
                        <>
                          <span className="font-medium text-foreground">
                            {ta(`nudge.${p.suggestedNudge}.label`)}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            {ta(`nudge.${p.suggestedNudge}.hint`)}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">{ta('tooEarlyToTell')}</span>
                      )}
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
    case 'irregular':
      return 'warning';
    case 'missing':
      return 'danger';
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
