'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '@/app/_ekklesia/session';
import {
  Button,
  Field,
  PageHeader,
  Panel,
  StatusPill,
  Tab,
  TabList,
  Table,
  TableWrap,
  Tabs,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from '@/app/_ekklesia/ui';
import { FormDialog, ListState, useRowAction } from '../../../_components/kit';
import { formatDate, titleCase } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import { usePeopleNames } from '../../../_lib/use-people-names';
import { t } from '@/app/_ekklesia/i18n/core';

interface CorrectionRequest {
  id: string;
  personId: string;
  sessionId: string;
  serviceDate: string | null;
  eventTitle: string | null;
  requestedPresence: 'present' | 'absent' | 'late';
  status: 'pending' | 'approved' | 'rejected';
  note: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

const STATUSES = ['pending', 'approved', 'rejected'] as const;
type Status = (typeof STATUSES)[number];
const TONE = { pending: 'pending', approved: 'success', rejected: 'danger' } as const;

export function CorrectionsClient(): React.ReactElement {
  const [status, setStatus] = useState<Status>('pending');
  const list = useApiList<CorrectionRequest>(
    `/api/v1/attendance/correction-requests?status=${status}&limit=100`,
  );
  const names = usePeopleNames(list.items.map((c) => c.personId));
  const { busyKey, run } = useRowAction();
  const [rejecting, setRejecting] = useState<CorrectionRequest | null>(null);

  const resolve = async (
    c: CorrectionRequest,
    action: 'approve' | 'reject',
    resolutionNote?: string,
  ): Promise<void> => {
    await apiFetch(`/api/v1/attendance/correction-requests/${c.id}/resolve`, {
      method: 'POST',
      json: { action, ...(resolutionNote ? { resolutionNote } : {}) },
    });
    void list.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/admin/attendance">{t('Attendance')}</Link>}
        title={t('Attendance corrections')}
        lede={t('Members who say their attendance was recorded wrongly. Approving updates their record for that service, including finalized totals.')}
      />

      <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
        <TabList aria-label={t('Correction status')}>
          {STATUSES.map((s) => (
            <Tab key={s} value={s}>
              {titleCase(s)}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={t('{0} corrections', titleCase(status))}
        subtitle={list.loading ? t('Loading…') : t('{0} shown', list.items.length)}
        flush
      >
        <ListState
          loading={list.loading}
          error={list.error}
          forbidden={list.forbidden}
          isEmpty={list.items.length === 0}
          onRetry={() => void list.reload()}
          empty={{
            icon: 'calendar-check',
            title: status === 'pending' ? t('No corrections to review') : t('No {0} corrections', titleCase(status).toLowerCase()),
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{t('Member')}</TH>
                  <TH>{t('Service')}</TH>
                  <TH>{t('Asks to be marked')}</TH>
                  <TH>{t('Note')}</TH>
                  <TH>{t('Status')}</TH>
                  {status === 'pending' ? <TH className="text-right">{t('Decision')}</TH> : null}
                </TR>
              </THead>
              <TBody>
                {list.items.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium text-foreground">
                      <Link href={`/admin/people/${c.personId}`} className="hover:underline">
                        {names[c.personId] ?? '…'}
                      </Link>
                      <div className="text-xs font-normal text-muted-foreground">
                        {t('Asked')} {formatDate(c.createdAt)}
                      </div>
                    </TD>
                    <TD className="text-sm">
                      {c.eventTitle ?? t('Service')}
                      {c.serviceDate ? (
                        <div className="text-xs text-muted-foreground">{formatDate(c.serviceDate)}</div>
                      ) : null}
                    </TD>
                    <TD className="text-sm">{titleCase(c.requestedPresence)}</TD>
                    <TD className="max-w-xs text-sm text-muted-foreground">
                      {c.note ?? '—'}
                      {c.resolutionNote ? (
                        <div className="text-xs">{t('Reply:')} {c.resolutionNote}</div>
                      ) : null}
                    </TD>
                    <TD>
                      <StatusPill tone={TONE[c.status]}>{titleCase(c.status)}</StatusPill>
                    </TD>
                    {status === 'pending' ? (
                      <TD className="text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            iconLeft="check"
                            loading={busyKey === c.id}
                            disabled={busyKey !== null}
                            onClick={() =>
                              void run(c.id, () => resolve(c, 'approve'), {
                                success: t('Attendance updated'),
                                detail: t('{0} is now marked {1}.', names[c.personId] ?? t('The member'), titleCase(c.requestedPresence).toLowerCase()),
                                failure: t('Could not approve'),
                              })
                            }
                          >
                            {t('Approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyKey !== null}
                            onClick={() => setRejecting(c)}
                          >
                            {t('Reject')}
                          </Button>
                        </div>
                      </TD>
                    ) : null}
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </ListState>
      </Panel>

      {rejecting ? (
        <RejectDialog
          onClose={() => setRejecting(null)}
          onReject={async (note) => {
            await resolve(rejecting, 'reject', note);
            setRejecting(null);
          }}
        />
      ) : null}
    </div>
  );
}

function RejectDialog({
  onClose,
  onReject,
}: {
  onClose: () => void;
  onReject: (note: string | undefined) => Promise<void>;
}): React.ReactElement {
  const [note, setNote] = useState('');
  return (
    <FormDialog
      title={t('Reject correction')}
      description={t('The attendance record stays as it is.')}
      submitLabel={t('Reject')}
      submitVariant="destructive"
      size="sm"
      onClose={onClose}
      onSubmit={() => onReject(note.trim() || undefined)}
    >
      {(errors) => (
        <Field label={t('Reply to the member')} hint="Optional." error={errors.resolutionNote}>
          <Textarea data-autofocus value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} />
        </Field>
      )}
    </FormDialog>
  );
}
