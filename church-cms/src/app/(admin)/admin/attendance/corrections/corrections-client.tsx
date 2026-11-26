'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { formatDate } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import { usePeopleNames } from '../../../_lib/use-people-names';

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
  const t = useTranslations('AdminCorrections');
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
        eyebrow={<Link href="/admin/attendance">{t('attendance')}</Link>}
        title={t('title')}
        lede={t('lede')}
      />

      <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
        <TabList aria-label={t('correctionStatus')}>
          {STATUSES.map((s) => (
            <Tab key={s} value={s}>
              {t('status', { status: s })}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={t('panelTitle', { status })}
        subtitle={list.loading ? t('loading') : t('shown', { count: list.items.length })}
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
            title: status === 'pending' ? t('emptyPending') : t('emptyOther', { status }),
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{t('member')}</TH>
                  <TH>{t('service')}</TH>
                  <TH>{t('asksToBeMarked')}</TH>
                  <TH>{t('note')}</TH>
                  <TH>{t('statusHeader')}</TH>
                  {status === 'pending' ? <TH className="text-right">{t('decision')}</TH> : null}
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
                        {t('askedOn', { date: formatDate(c.createdAt) })}
                      </div>
                    </TD>
                    <TD className="text-sm">
                      {c.eventTitle ?? t('service')}
                      {c.serviceDate ? (
                        <div className="text-xs text-muted-foreground">{formatDate(c.serviceDate)}</div>
                      ) : null}
                    </TD>
                    <TD className="text-sm">{t('presence', { presence: c.requestedPresence })}</TD>
                    <TD className="max-w-xs text-sm text-muted-foreground">
                      {c.note ?? '—'}
                      {c.resolutionNote ? (
                        <div className="text-xs">{t('reply', { note: c.resolutionNote })}</div>
                      ) : null}
                    </TD>
                    <TD>
                      <StatusPill tone={TONE[c.status]}>{t('status', { status: c.status })}</StatusPill>
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
                                success: t('approved'),
                                detail: t('approvedBody', {
                                  member: names[c.personId] ?? t('theMember'),
                                  presence: c.requestedPresence,
                                }),
                                failure: t('approveFailed'),
                              })
                            }
                          >
                            {t('approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyKey !== null}
                            onClick={() => setRejecting(c)}
                          >
                            {t('reject')}
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
  const t = useTranslations('AdminCorrections');
  const [note, setNote] = useState('');
  return (
    <FormDialog
      title={t('rejectTitle')}
      description={t('rejectDesc')}
      submitLabel={t('reject')}
      submitVariant="destructive"
      size="sm"
      onClose={onClose}
      onSubmit={() => onReject(note.trim() || undefined)}
    >
      {(errors) => (
        <Field label={t('replyToMember')} hint={t('optional')} error={errors.resolutionNote}>
          <Textarea data-autofocus value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} />
        </Field>
      )}
    </FormDialog>
  );
}
