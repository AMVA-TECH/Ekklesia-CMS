'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { ApiError, apiFetch, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Button,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  Skeleton,
  StatusPill,
  Textarea,
  useToast,
} from '@/app/_ekklesia/ui';
import type { MemberPerson } from '../../_shared/api-types';
import { formatServiceDate } from '../../_shared/formatters';

type DayStatus = 'full' | 'partial' | 'notice' | 'absent';
interface FamilyAttendance {
  householdId: string;
  label: string;
  from: string;
  to: string;
  members: Array<{ personId: string; displayName: string }>;
  days: Array<{
    serviceDate: string;
    status: DayStatus;
    adultsPresent: number;
    adultCount: number;
    members: Array<{
      personId: string;
      displayName: string;
      status: 'present' | 'notice' | 'absent';
    }>;
  }>;
}

const DAY_TONE = {
  full: 'success',
  partial: 'info',
  notice: 'neutral',
  absent: 'warning',
} as const;

export function FamilyAttendanceClient(): React.ReactElement {
  const t = useTranslations('MemberAttendance');
  const [family, setFamily] = useState<FamilyAttendance | null>(null);
  const [me, setMe] = useState<MemberPerson | null>(null);
  const [noHousehold, setNoHousehold] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const [famRes, meRes] = await Promise.allSettled([
      apiFetch<FamilyAttendance>('/api/v1/attendance/family'),
      apiFetch<MemberPerson>('/api/v1/people/me'),
    ]);
    if (meRes.status === 'fulfilled') setMe(meRes.value);
    if (famRes.status === 'fulfilled') {
      setFamily(famRes.value);
      setNoHousehold(false);
      setError(null);
    } else {
      const e = famRes.reason;
      if (e instanceof ApiError && (e.status === 422 || e.status === 404)) {
        setNoHousehold(true);
      } else {
        setError(
          e instanceof ApiError ? e.message : t('connection'),
        );
      }
    }
    setLoading(false);
  }, [t]);
  useLoadEffect(load);

  const people = family?.members.length
    ? family.members
    : me
      ? [{ personId: me.id, displayName: me.displayName }]
      : [];

  const dayLabel = (status: DayStatus): string => {
    if (status === 'full') return t('dayFull');
    if (status === 'partial') return t('dayPartial');
    if (status === 'notice') return t('dayNotice');
    return t('dayAbsent');
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/attendance">{t('backMine')}</Link>}
        title={t('familyTitle')}
        lede={t('familyLede')}
      />

      <Panel title={t('awayPanelTitle')} subtitle={t('awayPanelSubtitle')}>
        {loading ? (
          <Skeleton size="block" />
        ) : people.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('notLinked')}</p>
        ) : (
          <AbsenceForm people={people} onSent={() => void load()} />
        )}
      </Panel>

      <Panel
        title={family ? family.label : t('household')}
        subtitle={
          family
            ? `${formatServiceDate(family.from)} – ${formatServiceDate(family.to)}`
            : undefined
        }
      >
        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton size="block" />
            <Skeleton size="block" />
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-[color:var(--danger-ink)]">
            {error}
          </p>
        ) : noHousehold || !family ? (
          <EmptyState
            icon="home"
            tone="sage"
            title={t('noHousehold')}
            description={t('noHouseholdBody')}
          />
        ) : family.days.length === 0 ? (
          <EmptyState
            icon="calendar"
            tone="sky"
            title={t('noServicesPeriod')}
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {[...family.days].reverse().map((d) => (
              <li key={d.serviceDate} className="flex flex-col gap-1 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {formatServiceDate(d.serviceDate)}
                  </span>
                  <StatusPill tone={DAY_TONE[d.status]}>
                    {dayLabel(d.status)}
                  </StatusPill>
                </div>
                <p className="text-xs text-muted-foreground">
                  {d.members
                    .map(
                      (m) =>
                        `${m.displayName} ${
                          m.status === 'present'
                            ? '✓'
                            : m.status === 'notice'
                              ? t('memberAway')
                              : '—'
                        }`,
                    )
                    .join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function AbsenceForm({
  people,
  onSent,
}: {
  people: Array<{ personId: string; displayName: string }>;
  onSent: () => void;
}): React.ReactElement {
  const t = useTranslations('MemberAttendance');
  const { push } = useToast();
  const [personId, setPersonId] = useState(people[0]?.personId ?? '');
  const [serviceDate, setServiceDate] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    if (!serviceDate || !reason.trim()) {
      setError(t('chooseDateReason'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      await apiFetch('/api/v1/absence-notices', {
        method: 'POST',
        json: { personId, serviceDate, reason: reason.trim() },
      });
      push({
        tone: 'success',
        title: t('thankYou'),
        message: t('awayRecorded'),
      });
      setServiceDate('');
      setReason('');
      onSent();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('sendFail'));
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {people.length > 1 ? (
          <Field label={t('who')}>
            <Select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
            >
              {people.map((p) => (
                <option key={p.personId} value={p.personId}>
                  {p.displayName}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label={t('serviceDate')} required>
          <Input
            type="date"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
          />
        </Field>
      </div>
      <Field label={t('reason')} required hint={t('reasonHint')}>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={1000}
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-[color:var(--danger-ink)]">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="self-start" loading={sending}>
        {t('letChurchKnow')}
      </Button>
    </form>
  );
}
