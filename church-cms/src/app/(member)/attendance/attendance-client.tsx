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
  type StatusTone,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type { MyAttendance } from '../_shared/api-types';
import { formatServiceDate } from '../_shared/formatters';

export function AttendanceClient(): React.ReactElement {
  const [data, setData] = useState<MyAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setForbidden(false);
    apiFetch<MyAttendance>('/api/v1/attendance/me')
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
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

  const bandCopy = useMemo(() => bandNarrative(data?.band), [data?.band]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My attendance"
        lede="A gentle record of your Sundays and services — only visible to you."
      />

      {loading ? (
        <AttendanceSkeleton />
      ) : forbidden ? (
        <EmptyState
          icon="calendar-check"
          tone="sky"
          title="Attendance isn’t tracked for you yet"
          description="When your church starts recording attendance for your services, your record will show here."
        />
      ) : error ? (
        <ErrorCard message={error} />
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              label="Services held"
              value={data.sessionsHeld.toString()}
              icon="calendar"
              tone="sky"
              hint={`${data.from} – ${data.to}`}
            />
            <Metric
              label="Present"
              value={data.presentCount.toString()}
              icon="check-circle"
              tone="sage"
            />
            <Metric
              label="Attendance rate"
              value={data.rate !== null ? `${Math.round(data.rate * 100)}%` : '—'}
              icon="chart"
              tone="gold"
            />
          </div>

          <Card padding="md" className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`inline-flex h-11 w-11 items-center justify-center rounded-md ${bandCopy.toneClass}`}
            >
              <Icon name={bandCopy.icon} size={20} />
            </span>
            <div>
              <CardTitle>{bandCopy.title}</CardTitle>
              <CardSubtitle>{bandCopy.message}</CardSubtitle>
              {data.noticeCount > 0 ? (
                <p className="mt-2 inline-flex">
                  <Badge tone="lavender">
                    {data.noticeCount} absence{' '}
                    {data.noticeCount === 1 ? 'note' : 'notes'} sent
                  </Badge>
                </p>
              ) : null}
            </div>
          </Card>

          <Panel
            title="Service history"
            subtitle="The last few services on your record."
          >
            {data.calendar.length === 0 ? (
              <EmptyState
                icon="calendar-check"
                tone="sky"
                title="No services recorded yet"
                description="Your attendance will fill in here once services start being recorded."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.calendar
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map((entry) => (
                    <li
                      key={entry.serviceDate}
                      className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${statusToneBg(entry.status)}`}
                        >
                          <Icon name={statusIcon(entry.status)} size={16} />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {formatServiceDate(entry.serviceDate)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {statusLabel(entry.status)}
                          </p>
                        </div>
                      </div>
                      <StatusPill tone={statusPillTone(entry.status)}>
                        {statusLabel(entry.status)}
                      </StatusPill>
                    </li>
                  ))}
              </ul>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}

function AttendanceSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton size="block" className="h-28 w-full" radius="md" />
        <Skeleton size="block" className="h-28 w-full" radius="md" />
        <Skeleton size="block" className="h-28 w-full" radius="md" />
      </div>
      <Skeleton size="block" className="h-24 w-full" radius="md" />
      <Skeleton size="block" className="h-72 w-full" radius="md" />
    </div>
  );
}

function ErrorCard({ message }: { message: string }): React.ReactElement {
  return (
    <Card padding="lg" className="flex items-start gap-3">
      <Icon
        name="alert-circle"
        size={20}
        className="mt-0.5 text-[color:var(--danger-ink)]"
      />
      <div>
        <CardTitle>We couldn’t load your attendance</CardTitle>
        <CardSubtitle>{message}</CardSubtitle>
      </div>
    </Card>
  );
}

function bandNarrative(band: string | undefined): {
  title: string;
  message: string;
  icon: Parameters<typeof Icon>[0]['name'];
  toneClass: string;
} {
  switch (band) {
    case 'strong':
      return {
        title: 'Steady and present',
        message:
          'You’re showing up — your church family sees it, and it strengthens them too.',
        icon: 'heart',
        toneClass: 'tone-sage',
      };
    case 'steady':
      return {
        title: 'Keeping in rhythm',
        message:
          'You’ve been attending regularly. Keep walking at a pace that fits your life.',
        icon: 'check-circle',
        toneClass: 'tone-sky',
      };
    case 'light':
      return {
        title: 'We’ve missed you',
        message:
          'It has been a little while between services. We’d love to see you when you’re able.',
        icon: 'heart',
        toneClass: 'tone-peach',
      };
    case 'absent':
      return {
        title: 'Hoping to welcome you back',
        message:
          'We haven’t seen you in a while. Reach out to your pastor if there’s anything we can pray for.',
        icon: 'alert',
        toneClass: 'tone-lavender',
      };
    default:
      return {
        title: 'Your attendance',
        message: 'Here is a quiet look at your recent services.',
        icon: 'calendar-check',
        toneClass: 'tone-sky',
      };
  }
}

function statusToneBg(status: 'present' | 'absent' | 'notice'): string {
  if (status === 'present') return 'tone-sage';
  if (status === 'notice') return 'tone-lavender';
  return 'bg-surface-muted text-muted-foreground';
}

function statusIcon(
  status: 'present' | 'absent' | 'notice',
): Parameters<typeof Icon>[0]['name'] {
  if (status === 'present') return 'check-circle';
  if (status === 'notice') return 'info';
  return 'minus';
}

function statusLabel(status: 'present' | 'absent' | 'notice'): string {
  if (status === 'present') return 'Present';
  if (status === 'notice') return 'Absence noted';
  return 'Away';
}

function statusPillTone(status: 'present' | 'absent' | 'notice'): StatusTone {
  if (status === 'present') return 'success';
  if (status === 'notice') return 'info';
  return 'neutral';
}
