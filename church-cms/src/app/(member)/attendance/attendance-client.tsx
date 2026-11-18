'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
  buttonClassName,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type { MyAttendance } from '../_shared/api-types';
import { formatServiceDate } from '../_shared/formatters';

export function AttendanceClient(): React.ReactElement {
  const t = useTranslations('MemberAttendance');
  const [data, setData] = useState<MyAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
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
          setError(t('connection'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const bandCopy = useMemo(() => bandNarrative(data?.band, t), [data?.band, t]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('title')}
        lede={t('lede')}
        actions={
          <Link
            href="/attendance/family"
            className={buttonClassName({ variant: 'secondary', size: 'sm' })}
          >
            {t('familyAwayLink')}
          </Link>
        }
      />

      {loading ? (
        <AttendanceSkeleton />
      ) : forbidden ? (
        <EmptyState
          icon="calendar-check"
          tone="sky"
          title={t('notTracked')}
          description={t('notTrackedBody')}
        />
      ) : error ? (
        <ErrorCard message={error} />
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              label={t('servicesHeld')}
              value={data.sessionsHeld.toString()}
              icon="calendar"
              tone="sky"
              hint={`${formatServiceDate(data.from)} – ${formatServiceDate(data.to)}`}
            />
            <Metric
              label={t('present')}
              value={data.presentCount.toString()}
              icon="check-circle"
              tone="sage"
            />
            <Metric
              label={t('attendanceRate')}
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
                    {data.noticeCount === 1
                      ? t('absenceNote', { count: data.noticeCount })
                      : t('absenceNotes', { count: data.noticeCount })}
                  </Badge>
                </p>
              ) : null}
            </div>
          </Card>

          <Panel
            title={t('serviceHistory')}
            subtitle={t('serviceHistorySubtitle')}
          >
            {data.calendar.length === 0 ? (
              <EmptyState
                icon="calendar-check"
                tone="sky"
                title={t('noServices')}
                description={t('noServicesBody')}
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
                            {statusLabel(entry.status, t)}
                          </p>
                        </div>
                      </div>
                      <StatusPill tone={statusPillTone(entry.status)}>
                        {statusLabel(entry.status, t)}
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
  const t = useTranslations('MemberAttendance');
  return (
    <Card padding="lg" className="flex items-start gap-3">
      <Icon
        name="alert-circle"
        size={20}
        className="mt-0.5 text-[color:var(--danger-ink)]"
      />
      <div>
        <CardTitle>{t('loadFail')}</CardTitle>
        <CardSubtitle>{message}</CardSubtitle>
      </div>
    </Card>
  );
}

type AttendanceT = ReturnType<typeof useTranslations<'MemberAttendance'>>;

function bandNarrative(
  band: string | undefined,
  t: AttendanceT,
): {
  title: string;
  message: string;
  icon: Parameters<typeof Icon>[0]['name'];
  toneClass: string;
} {
  switch (band) {
    case 'strong':
      return {
        title: t('steady'),
        message: t('steadyBody'),
        icon: 'heart',
        toneClass: 'tone-sage',
      };
    case 'steady':
      return {
        title: t('rhythm'),
        message: t('rhythmBody'),
        icon: 'check-circle',
        toneClass: 'tone-sky',
      };
    case 'light':
      return {
        title: t('missed'),
        message: t('missedBody'),
        icon: 'heart',
        toneClass: 'tone-peach',
      };
    case 'absent':
      return {
        title: t('welcomeBack'),
        message: t('welcomeBackBody'),
        icon: 'alert',
        toneClass: 'tone-lavender',
      };
    default:
      return {
        title: t('yourAttendance'),
        message: t('defaultBody'),
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

function statusLabel(
  status: 'present' | 'absent' | 'notice',
  t: AttendanceT,
): string {
  if (status === 'present') return t('statusPresent');
  if (status === 'notice') return t('statusNotice');
  return t('statusAway');
}

function statusPillTone(status: 'present' | 'absent' | 'notice'): StatusTone {
  if (status === 'present') return 'success';
  if (status === 'notice') return 'info';
  return 'neutral';
}
