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
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('AdminPages');
  const ta = useTranslations('AdminAttendance');
  const tc = useTranslations('Common');
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
        eyebrow={<Link href="/admin/attendance">{t('attendance')}</Link>}
        title={t('absences')}
        lede={t('absencesLede')}
      />

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(range);
        }}
      >
        <Field label={ta('from')}>
          <Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        </Field>
        <Field label={ta('to')}>
          <Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        </Field>
        <Button type="submit" variant="secondary" iconLeft="filter">
          {ta('filter')}
        </Button>
      </form>

      <Panel title={ta('notices')} subtitle={notices.loading ? tc('loading') : tc('shownCount', { count: notices.items.length })} flush>
        <ListState
          loading={notices.loading}
          error={notices.error}
          forbidden={notices.forbidden}
          isEmpty={notices.items.length === 0}
          onRetry={() => void notices.reload()}
          empty={{ icon: 'calendar', title: ta('noAbsences') }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{ta('personCol')}</TH>
                  <TH>{ta('serviceDate')}</TH>
                  <TH>{ta('reason')}</TH>
                  <TH>{ta('status')}</TH>
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
