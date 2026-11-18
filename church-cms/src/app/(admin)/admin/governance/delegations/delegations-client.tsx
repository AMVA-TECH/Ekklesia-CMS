'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, useSession } from '@/app/_ekklesia/session';
import {
  Button,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  StatusPill,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from '@/app/_ekklesia/ui';
import { FormDialog, ListState, useRowAction } from '../../../_components/kit';
import { formatDateTime, titleCase } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';

interface Delegation {
  id: string;
  delegatorUserId: string;
  delegateUserId: string;
  grants: string[];
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'scheduled' | 'active' | 'ended' | 'revoked';
  reason: string | null;
}
interface OrgUser {
  id: string;
  userAccountId: string;
  label: string;
  email: string | null;
}

const TONE = { scheduled: 'info', active: 'success', ended: 'neutral', revoked: 'danger' } as const;

export function DelegationsClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tg = useTranslations('AdminGovernance');
  const tc = useTranslations('Common');
  const delegations = useApiList<Delegation>('/api/v1/delegations?limit=100');
  const users = useApiList<OrgUser>('/api/v1/organisation-users');
  const [creating, setCreating] = useState(false);
  const { busyKey, run } = useRowAction();

  const userLabel = useMemo(() => {
    const map = new Map(
      users.items.map((u) => [u.userAccountId, u.label || u.email || tg('userFallback')]),
    );
    return (id: string): string => map.get(id) ?? tg('userFallback');
  }, [users.items, tg]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('delegations')}
        lede={t('delegationsLede')}
        actions={
          <Button iconLeft="plus" onClick={() => setCreating(true)}>
            {tg('newDelegation')}
          </Button>
        }
      />

      <Panel
        title={tg('delegations')}
        subtitle={
          delegations.loading
            ? tc('loading')
            : tc('totalCount', { count: delegations.items.length })
        }
        flush
      >
        <ListState
          loading={delegations.loading}
          error={delegations.error}
          forbidden={delegations.forbidden}
          isEmpty={delegations.items.length === 0}
          onRetry={() => void delegations.reload()}
          empty={{ icon: 'key', title: tg('noDelegations') }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tg('fromTo')}</TH>
                  <TH>{tg('permissions')}</TH>
                  <TH>{tg('period')}</TH>
                  <TH>{tg('status')}</TH>
                  <TH className="text-right">{tg('actions')}</TH>
                </TR>
              </THead>
              <TBody>
                {delegations.items.map((d) => (
                  <TR key={d.id}>
                    <TD className="text-sm">
                      <span className="font-medium text-foreground">{userLabel(d.delegatorUserId)}</span>
                      {' → '}
                      <span className="font-medium text-foreground">{userLabel(d.delegateUserId)}</span>
                      {d.reason ? <div className="text-xs text-muted-foreground">{d.reason}</div> : null}
                    </TD>
                    <TD className="max-w-xs text-xs text-muted-foreground">{d.grants.join(', ')}</TD>
                    <TD className="text-xs">
                      {formatDateTime(d.effectiveFrom)}
                      <br />
                      {d.effectiveTo
                        ? tg('untilDate', { date: formatDateTime(d.effectiveTo) })
                        : tg('untilRevoked')}
                    </TD>
                    <TD>
                      <StatusPill tone={TONE[d.status]}>{titleCase(d.status)}</StatusPill>
                    </TD>
                    <TD className="text-right">
                      {d.status === 'active' || d.status === 'scheduled' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyKey === d.id}
                          disabled={busyKey !== null}
                          onClick={async () => {
                            const ok = await run(
                              d.id,
                              () => apiFetch(`/api/v1/delegations/${d.id}/revoke`, { method: 'POST' }),
                              {
                                success: tg('delegationRevoked'),
                                failure: tg('couldNotRevoke'),
                              },
                            );
                            if (ok) void delegations.reload();
                          }}
                        >
                          {tg('revoke')}
                        </Button>
                      ) : null}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </ListState>
      </Panel>

      {creating ? (
        <CreateDelegationDialog
          users={users.items}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void delegations.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function CreateDelegationDialog({
  users,
  onClose,
  onCreated,
}: {
  users: OrgUser[];
  onClose: () => void;
  onCreated: () => void;
}): React.ReactElement {
  const tg = useTranslations('AdminGovernance');
  const { session } = useSession();
  // You can only hand over permissions you hold yourself.
  const available = useMemo(
    () => [...(session?.permissions ?? [])].sort(),
    [session?.permissions],
  );
  const me = session?.user?.id;
  const [delegateUserId, setDelegateUserId] = useState('');
  const [grants, setGrants] = useState<Set<string>>(() => new Set());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');

  return (
    <FormDialog
      title={tg('newDelegationTitle')}
      submitLabel={tg('delegate')}
      size="lg"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!delegateUserId) e.delegateUserId = tg('chooseDelegate');
        if (grants.size === 0) e.grants = tg('choosePermission');
        if (!from) e.effectiveFrom = tg('chooseStart');
        if (from && to && to <= from) e.effectiveTo = tg('endAfterStart');
        return e;
      }}
      onSubmit={async () => {
        await apiFetch('/api/v1/delegations', {
          method: 'POST',
          json: {
            delegateUserId,
            grants: Array.from(grants),
            effectiveFrom: new Date(from).toISOString(),
            ...(to ? { effectiveTo: new Date(to).toISOString() } : {}),
            ...(reason.trim() ? { reason: reason.trim() } : {}),
          },
        });
        onCreated();
      }}
    >
      {(errors) => (
        <>
          <Field label={tg('delegateTo')} required error={errors.delegateUserId}>
            <Select data-autofocus value={delegateUserId} onChange={(e) => setDelegateUserId(e.target.value)}>
              <option value="">{tg('chooseLeader')}</option>
              {users
                .filter((u) => u.userAccountId !== me)
                .map((u) => (
                  <option key={u.userAccountId} value={u.userAccountId}>
                    {u.label}
                    {u.email ? ` (${u.email})` : ''}
                  </option>
                ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tg('starts')} required error={errors.effectiveFrom}>
              <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label={tg('ends')} hint={tg('endsHint')} error={errors.effectiveTo}>
              <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <Field label={tg('permissions')} required error={errors.grants}>
            <div className="grid max-h-56 gap-1 overflow-auto rounded-md border border-border p-2 sm:grid-cols-2">
              {available.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tg('noPermissionsToDelegate')}</p>
              ) : (
                available.map((code) => (
                  <label key={code} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={grants.has(code)}
                      onChange={(e) =>
                        setGrants((g) => {
                          const next = new Set(g);
                          if (e.target.checked) next.add(code);
                          else next.delete(code);
                          return next;
                        })
                      }
                    />
                    <span className="font-mono text-xs">{code}</span>
                  </label>
                ))
              )}
            </div>
          </Field>
          <Field label={tg('reason')} error={errors.reason}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
