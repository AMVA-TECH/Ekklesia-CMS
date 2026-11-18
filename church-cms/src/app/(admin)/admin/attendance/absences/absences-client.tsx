'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Button,
  Field,
  Input,
  PageHeader,
  Panel,
  StatusPill,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/app/_ekklesia/ui';
import { ListState } from '../../../_components/kit';
import { formatDate, titleCase } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import { usePeopleNames } from '../../../_lib/use-people-names';
import { t } from '@/app/_ekklesia/i18n/core';

interface AbsenceNotice {
  id: string;
  personId: string;
  householdId: string | null;
  serviceDate: string;
  eventId: string | null;
  reason: string;
  status: string;
}

export function AbsencesClient(): React.ReactElement {
  const [range, setRange] = useState({ from: '', to: '' });
  const [applied, setApplied] = useState(range);
  const url = useMemo(() => {
    const p = new URLSearchParams({ limit: '100' });
    if (applied.from) p.set('from', applied.from);
    if (applied.to) p.set('to', applied.to);
    return `/api/v1/absence-notices?${p.toString()}`;
  }, [applied]);
  const notices = useApiList<AbsenceNotice>(url);
  const names = usePeopleNames(notices.items.map((n) => n.personId));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/admin/attendance">{t('Attendance')}</Link>}
        title={t('Absence notices')}
        lede={t('People who let the church know they\'d be away — so follow-up lists don\'t flag them.')}
      />

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(range);
        }}
      >
        <Field label={t('From')}>
          <Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        </Field>
        <Field label={t('To')}>
          <Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        </Field>
        <Button type="submit" variant="secondary" iconLeft="filter">
          {t('Filter')}
        </Button>
      </form>

      <Panel title={t('Notices')} subtitle={notices.loading ? t('Loading…') : t('{0} shown', notices.items.length)} flush>
        <ListState
          loading={notices.loading}
          error={notices.error}
          forbidden={notices.forbidden}
          isEmpty={notices.items.length === 0}
          onRetry={() => void notices.reload()}
          empty={{ icon: 'calendar', title: t('No absence notices in this period') }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{t('Person')}</TH>
                  <TH>{t('Service date')}</TH>
                  <TH>{t('Reason')}</TH>
                  <TH>{t('Status')}</TH>
                </TR>
              </THead>
              <TBody>
                {notices.items.map((n) => (
                  <TR key={n.id}>
                    <TD className="font-medium text-foreground">
                      <Link href={`/admin/people/${n.personId}`} className="hover:underline">
                        {names[n.personId] ?? '…'}
                      </Link>
                    </TD>
                    <TD className="text-sm">{formatDate(n.serviceDate)}</TD>
                    <TD className="max-w-md text-sm text-muted-foreground">{n.reason}</TD>
                    <TD>
                      <StatusPill tone="neutral">{titleCase(n.status)}</StatusPill>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </ListState>
      </Panel>
    </div>
  );
}
