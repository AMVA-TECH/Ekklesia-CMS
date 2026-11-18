'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { formatDate } from '../../../_lib/format';
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
  const t = useTranslations('AdminMinistryRequests');
  const [status, setStatus] = useState<Status>('pending');
  const [unitId, setUnitId] = useState('');
  const requests = useApiList<ParticipationRequest>(
    `/api/v1/participation-requests?status=${status}&limit=100${unitId ? `&organisationalUnitId=${unitId}` : ''}`,
  );
  const units = useApiList<OrganisationalUnit>('/api/v1/organisational-units?limit=100');
  const names = usePeopleNames(requests.items.map((r) => r.personId));
  const unitName = useMemo(() => {
    const map = new Map(units.items.map((u) => [u.id, u.name]));
    return (id: string): string => map.get(id) ?? t('ministry');
  }, [units.items, t]);
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
        eyebrow={<Link href="/admin/ministries">{t('ministries')}</Link>}
        title={t('title')}
        lede={t('lede')}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as Status)}>
          <TabList aria-label={t('requestStatus')}>
            {STATUSES.map((s) => (
              <Tab key={s} value={s}>
                {t('status', { status: s })}
              </Tab>
            ))}
          </TabList>
        </Tabs>
        <Field label={t('ministry')} className="sm:w-64">
          <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">{t('allMyMinistries')}</option>
            {units.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Panel
        title={t('panelTitle', { status })}
        subtitle={requests.loading ? t('loading') : t('shown', { count: requests.items.length })}
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
            title: status === 'pending' ? t('emptyPending') : t('emptyOther', { status }),
            description: status === 'pending' ? t('emptyPendingBody') : undefined,
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{t('member')}</TH>
                  <TH>{t('ministry')}</TH>
                  <TH>{t('requested')}</TH>
                  <TH>{t('statusHeader')}</TH>
                  {status === 'pending' ? <TH className="text-right">{t('decision')}</TH> : null}
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
                      <StatusPill tone={TONE[r.status]}>{t('status', { status: r.status })}</StatusPill>
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
                            {t('approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={busyKey === r.id}
                            disabled={busyKey !== null}
                            onClick={() =>
                              void run(r.id, () => decide(r, 'rejected'), {
                                success: t('declined'),
                                detail: t('declinedBody'),
                                failure: t('declineFailed'),
                              })
                            }
                          >
                            {t('decline')}
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
          memberName={names[approving.personId] ?? t('thisMember')}
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
  const t = useTranslations('AdminMinistryRequests');
  const [role, setRole] = useState('');
  return (
    <FormDialog
      title={t('approveTitle')}
      description={t('approveDesc', { member: memberName, ministry: ministryName })}
      submitLabel={t('approve')}
      size="sm"
      onClose={onClose}
      onSubmit={() => onApprove(role.trim() || undefined)}
    >
      {(errors) => (
        <Field label={t('roleInMinistry')} hint={t('roleInMinistryHint')} error={errors.roleInUnit}>
          <Input data-autofocus value={role} onChange={(e) => setRole(e.target.value)} maxLength={100} />
        </Field>
      )}
    </FormDialog>
  );
}
