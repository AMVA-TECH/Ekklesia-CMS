'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, EmptyState, Panel, StatusPill } from '@/app/_ekklesia/ui';
import { ListState } from '../../../_components/kit';
import { formatDate } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import { usePeopleNames } from '../../../_lib/use-people-names';

interface EventRegistration {
  id: string;
  eventId: string;
  personId: string;
  status: 'registered' | 'cancelled';
  createdAt: string;
}

/** Who said they're coming (members register from the app). */
export function RegistrationsPanel({ eventId }: { eventId: string }): React.ReactElement {
  const t = useTranslations('AdminEvents');
  const regs = useApiList<EventRegistration>(`/api/v1/events/${eventId}/registrations`);
  const [showCancelled, setShowCancelled] = useState(false);
  const names = usePeopleNames(regs.items.map((r) => r.personId));
  const registered = useMemo(
    () => regs.items.filter((r) => r.status === 'registered'),
    [regs.items],
  );
  const cancelled = regs.items.length - registered.length;
  const shown = showCancelled ? regs.items : registered;

  return (
    <Panel
      title={t('registrations')}
      subtitle={
        regs.loading
          ? t('registrationsLoading')
          : cancelled
            ? t('registrationsSummaryCancelled', { coming: registered.length, cancelled })
            : t('registrationsSummary', { coming: registered.length })
      }
      actions={
        cancelled > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => setShowCancelled((v) => !v)}>
            {showCancelled ? t('hideCancelled') : t('showCancelled')}
          </Button>
        ) : null
      }
    >
      <ListState
        loading={regs.loading}
        error={regs.error}
        forbidden={regs.forbidden}
        isEmpty={regs.items.length === 0}
        onRetry={() => void regs.reload()}
        empty={{
          icon: 'calendar-check',
          title: t('noRegistrations'),
          description: t('noRegistrationsBody'),
        }}
      >
        {shown.length === 0 ? (
          <EmptyState icon="calendar-check" tone="neutral" title={t('allRegistrationsCancelled')} />
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {shown.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <Link
                    href={`/admin/people/${r.personId}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {names[r.personId] ?? '…'}
                  </Link>
                  <p className="text-xs text-muted-foreground">{t('registeredOn', { date: formatDate(r.createdAt) })}</p>
                </div>
                <StatusPill tone={r.status === 'registered' ? 'success' : 'neutral'}>
                  {r.status === 'registered' ? t('registrationComing') : t('registrationCancelled')}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </ListState>
    </Panel>
  );
}
