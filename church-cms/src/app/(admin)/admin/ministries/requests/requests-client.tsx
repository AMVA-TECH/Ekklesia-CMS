'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { apiFetch } from '@/app/_ekklesia/session';
import {
  Button,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
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
} from '@/app/_ekklesia/ui';
import type { OrganisationalUnit } from '../../../_lib/api-types';
import { FormDialog, ListState, useRowAction } from '../../../_components/kit';
import { formatDate, titleCase } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import { usePeopleNames } from '../../../_lib/use-people-names';

interface ParticipationRequest {
  id: string;
  organisationalUnitId: string;
  personId: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt: string | null;
  createdAt: string;
}

const STATUSES = ['pending', 'approved', 'rejected'] as const;
type Status = (typeof STATUSES)[number];
const TONE = { pending: 'pending', approved: 'success', rejected: 'danger' } as const;

export function MinistryRequestsClient(): React.ReactElement {
  const [status, setStatus] = useState<Status>('pending');
  const [unitId, setUnitId] = useState('');
  const requests = useApiList<ParticipationRequest>(
    `/api/v1/participation-requests?status=${status}&limit=100${unitId ? `&organisationalUnitId=${unitId}` : ''}`,
  );
  const units = useApiList<OrganisationalUnit>('/api/v1/organisational-units?limit=100');
  const names = usePeopleNames(requests.items.map((r) => r.personId));
  const unitName = useMemo(() => {
    const map = new Map(units.items.map((u) => [u.id, u.name]));
    return (id: string): string => map.get(id) ?? 'Ministry';
  }, [units.items]);
  const { busyKey, run } = useRowAction();
  const [approving, setApproving] = useState<ParticipationRequest | null>(null);

  const decide = async (
    r: ParticipationRequest,
    decision: 'approved' | 'rejected',
    roleInUnit?: string,
  ): Promise<void> => {
    await apiFetch(`/api/v1/participation-requests/${r.id}/decision`, {
      method: 'POST',
      json: { decision, ...(roleInUnit ? { roleInUnit } : {}) },
    });
    void requests.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/admin/ministries">Ministries</Link>}
        title="Ministry join requests"
        lede="Members asking to join a team. Approving adds them to the ministry straight away. Ministry leaders see requests for their own ministries."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
          <TabList aria-label="Request status">
            {STATUSES.map((s) => (
              <Tab key={s} value={s}>
                {titleCase(s)}
              </Tab>
            ))}
          </TabList>
        </Tabs>
        <Field label="Ministry" className="sm:w-64">
          <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">All my ministries</option>
            {units.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Panel
        title={`${titleCase(status)} requests`}
        subtitle={requests.loading ? 'Loading…' : `${requests.items.length} shown`}
        flush
      >
        <ListState
          loading={requests.loading}
          error={requests.error}
          forbidden={requests.forbidden}
          isEmpty={requests.items.length === 0}
          onRetry={() => void requests.reload()}
          empty={{
            icon: 'hand',
            title: status === 'pending' ? 'No one is waiting to join' : `No ${status} requests`,
            description:
              status === 'pending'
                ? 'When members ask to join a ministry from the app, their requests appear here.'
                : undefined,
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Member</TH>
                  <TH>Ministry</TH>
                  <TH>Requested</TH>
                  <TH>Status</TH>
                  {status === 'pending' ? <TH className="text-right">Decision</TH> : null}
                </TR>
              </THead>
              <TBody>
                {requests.items.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium text-foreground">
                      <Link href={`/admin/people/${r.personId}`} className="hover:underline">
                        {names[r.personId] ?? '…'}
                      </Link>
                    </TD>
                    <TD className="text-sm">{unitName(r.organisationalUnitId)}</TD>
                    <TD className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TD>
                    <TD>
                      <StatusPill tone={TONE[r.status]}>{titleCase(r.status)}</StatusPill>
                    </TD>
                    {status === 'pending' ? (
                      <TD className="text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            iconLeft="check"
                            disabled={busyKey !== null}
                            onClick={() => setApproving(r)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={busyKey === r.id}
                            disabled={busyKey !== null}
                            onClick={() =>
                              void run(r.id, () => decide(r, 'rejected'), {
                                success: 'Request declined',
                                detail: 'The member will see it was not approved.',
                                failure: 'Could not decline',
                              })
                            }
                          >
                            Decline
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

      {approving ? (
        <ApproveDialog
          memberName={names[approving.personId] ?? 'this member'}
          ministryName={unitName(approving.organisationalUnitId)}
          onClose={() => setApproving(null)}
          onApprove={async (role) => {
            await decide(approving, 'approved', role);
            setApproving(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ApproveDialog({
  memberName,
  ministryName,
  onClose,
  onApprove,
}: {
  memberName: string;
  ministryName: string;
  onClose: () => void;
  onApprove: (role: string | undefined) => Promise<void>;
}): React.ReactElement {
  const [role, setRole] = useState('');
  return (
    <FormDialog
      title="Approve join request"
      description={`${memberName} will join ${ministryName} from today.`}
      submitLabel="Approve"
      size="sm"
      onClose={onClose}
      onSubmit={() => onApprove(role.trim() || undefined)}
    >
      {(errors) => (
        <Field label="Role in ministry" hint="Optional, e.g. Singer or Usher." error={errors.roleInUnit}>
          <Input data-autofocus value={role} onChange={(e) => setRole(e.target.value)} maxLength={100} />
        </Field>
      )}
    </FormDialog>
  );
}
