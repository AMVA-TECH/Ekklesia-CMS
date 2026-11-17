'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
import type { Announcement } from '../../_lib/api-types';
import { FormDialog, ListState, useRowAction } from '../../_components/kit';
import { formatDate, formatMoney, titleCase } from '../../_lib/format';
import { useApiList } from '../../_lib/use-api-list';
import type { Expense } from '../finance/expenses/expense-types';

interface ApprovalRequest {
  id: string;
  subjectType: 'expense' | 'announcement' | 'appointment_request';
  subjectId: string;
  requestedByUserId: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  currentStep: number;
  createdAt: string;
}

const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
type Status = (typeof STATUSES)[number];

const TONE = {
  pending: 'pending',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
} as const;

type Decision = { approval: ApprovalRequest; action: 'approve' | 'reject' };

export function ApprovalsClient(): React.ReactElement {
  const [status, setStatus] = useState<Status>('pending');
  const approvals = useApiList<ApprovalRequest>(
    `/api/v1/approval-requests?status=${status}&limit=100`,
  );
  // Subject details (best effort: a 403 just leaves the summary generic).
  const expenses = useApiList<Expense>('/api/v1/expenses?limit=100');
  const announcements = useApiList<Announcement>('/api/v1/announcements');
  const [deciding, setDeciding] = useState<Decision | null>(null);
  const { busyKey, run } = useRowAction();

  const subjects = useMemo(() => {
    const map = new Map<string, { title: string; detail?: string; href?: string }>();
    for (const e of expenses.items) {
      map.set(e.id, {
        title: e.purpose,
        detail: `${formatMoney(e.amountMinor, e.currency)} · ${formatDate(e.expenseDate)}`,
        href: '/admin/finance/expenses',
      });
    }
    for (const a of announcements.items) {
      map.set(a.id, {
        title: a.title,
        detail: a.body.slice(0, 120),
        href: '/admin/messaging/announcements',
      });
    }
    return map;
  }, [expenses.items, announcements.items]);

  const decide = async (d: Decision, note?: string): Promise<void> => {
    await apiFetch(`/api/v1/approval-requests/${d.approval.id}/decision`, {
      method: 'POST',
      json: { action: d.action, ...(note ? { note } : {}) },
    });
    void approvals.reload();
    void expenses.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Approvals"
        lede="Second-person sign-off for spending and church-wide announcements. You can't decide a request you submitted yourself."
      />

      <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
        <TabList aria-label="Approval status">
          {STATUSES.map((s) => (
            <Tab key={s} value={s}>
              {titleCase(s)}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={`${titleCase(status)} requests`}
        subtitle={approvals.loading ? 'Loading…' : `${approvals.items.length} shown`}
        flush
      >
        <ListState
          loading={approvals.loading}
          error={approvals.error}
          forbidden={approvals.forbidden}
          isEmpty={approvals.items.length === 0}
          onRetry={() => void approvals.reload()}
          empty={{
            icon: 'check-circle',
            title: status === 'pending' ? 'Nothing waiting for approval' : `No ${status} requests`,
            description:
              status === 'pending'
                ? 'Submitted expenses and church-wide announcements will queue here.'
                : undefined,
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Request</TH>
                  <TH>Type</TH>
                  <TH>Submitted</TH>
                  <TH>Status</TH>
                  {status === 'pending' ? <TH className="text-right">Decision</TH> : null}
                </TR>
              </THead>
              <TBody>
                {approvals.items.map((a) => {
                  const subject = subjects.get(a.subjectId);
                  return (
                    <TR key={a.id}>
                      <TD>
                        <div className="font-medium text-foreground">
                          {subject?.href ? (
                            <Link href={subject.href} className="hover:underline">
                              {subject.title}
                            </Link>
                          ) : (
                            (subject?.title ?? `${titleCase(a.subjectType)} request`)
                          )}
                        </div>
                        {subject?.detail ? (
                          <div className="line-clamp-1 text-xs text-muted-foreground">
                            {subject.detail}
                          </div>
                        ) : null}
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {titleCase(a.subjectType)}
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {formatDate(a.createdAt)}
                      </TD>
                      <TD>
                        <StatusPill tone={TONE[a.status]}>{titleCase(a.status)}</StatusPill>
                      </TD>
                      {status === 'pending' ? (
                        <TD className="text-right">
                          <div className="inline-flex gap-2">
                            <Button
                              size="sm"
                              iconLeft="check"
                              loading={busyKey === a.id}
                              disabled={busyKey !== null}
                              onClick={() =>
                                void run(a.id, () => decide({ approval: a, action: 'approve' }), {
                                  success: 'Approved',
                                  detail:
                                    a.subjectType === 'expense'
                                      ? 'The expense is approved and posted to the ledger when its accounts are set.'
                                      : 'The announcement is published.',
                                  failure: 'Could not approve',
                                })
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busyKey !== null}
                              onClick={() => setDeciding({ approval: a, action: 'reject' })}
                            >
                              Reject
                            </Button>
                          </div>
                        </TD>
                      ) : null}
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        </ListState>
      </Panel>

      {deciding ? (
        <RejectDialog
          onClose={() => setDeciding(null)}
          onReject={async (note) => {
            await decide(deciding, note);
            setDeciding(null);
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
      title="Reject request"
      description="The requester can correct it and submit again."
      submitLabel="Reject"
      submitVariant="destructive"
      size="sm"
      onClose={onClose}
      onSubmit={() => onReject(note.trim() || undefined)}
    >
      {(errors) => (
        <Field label="Note" hint="Optional — explain what needs to change." error={errors.note}>
          <Textarea
            data-autofocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={3}
          />
        </Field>
      )}
    </FormDialog>
  );
}
