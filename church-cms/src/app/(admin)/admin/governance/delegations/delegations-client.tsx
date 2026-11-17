'use client';

import { useMemo, useState } from 'react';
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
  const delegations = useApiList<Delegation>('/api/v1/delegations?limit=100');
  const users = useApiList<OrgUser>('/api/v1/organisation-users');
  const [creating, setCreating] = useState(false);
  const { busyKey, run } = useRowAction();

  const userLabel = useMemo(() => {
    const map = new Map(users.items.map((u) => [u.userAccountId, u.label || u.email || 'User']));
    return (id: string): string => map.get(id) ?? 'User';
  }, [users.items]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Delegations"
        lede="Hand some of your permissions to another leader for a set period — for example while you travel. Every use is audited."
        actions={
          <Button iconLeft="plus" onClick={() => setCreating(true)}>
            New delegation
          </Button>
        }
      />

      <Panel title="Delegations" subtitle={delegations.loading ? 'Loading…' : `${delegations.items.length} total`} flush>
        <ListState
          loading={delegations.loading}
          error={delegations.error}
          forbidden={delegations.forbidden}
          isEmpty={delegations.items.length === 0}
          onRetry={() => void delegations.reload()}
          empty={{ icon: 'key', title: 'No delegations' }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>From → to</TH>
                  <TH>Permissions</TH>
                  <TH>Period</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
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
                      {d.effectiveTo ? `until ${formatDateTime(d.effectiveTo)}` : 'until revoked'}
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
                              { success: 'Delegation revoked', failure: 'Could not revoke' },
                            );
                            if (ok) void delegations.reload();
                          }}
                        >
                          Revoke
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
      title="New delegation"
      submitLabel="Delegate"
      size="lg"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!delegateUserId) e.delegateUserId = 'Choose who receives the permissions.';
        if (grants.size === 0) e.grants = 'Choose at least one permission.';
        if (!from) e.effectiveFrom = 'Choose when it starts.';
        if (from && to && to <= from) e.effectiveTo = 'End must be after the start.';
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
          <Field label="Delegate to" required error={errors.delegateUserId}>
            <Select data-autofocus value={delegateUserId} onChange={(e) => setDelegateUserId(e.target.value)}>
              <option value="">Choose a leader…</option>
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
            <Field label="Starts" required error={errors.effectiveFrom}>
              <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Ends" hint="Leave empty to run until revoked." error={errors.effectiveTo}>
              <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <Field label="Permissions" required error={errors.grants}>
            <div className="grid max-h-56 gap-1 overflow-auto rounded-md border border-border p-2 sm:grid-cols-2">
              {available.length === 0 ? (
                <p className="text-sm text-muted-foreground">You have no permissions to delegate.</p>
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
          <Field label="Reason" error={errors.reason}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
