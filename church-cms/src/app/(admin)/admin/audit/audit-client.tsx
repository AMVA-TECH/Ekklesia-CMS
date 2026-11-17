'use client';

import { useMemo, useState } from 'react';
import {
  Button,
  Field,
  Input,
  PageHeader,
  Panel,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/app/_ekklesia/ui';
import { ListState } from '../../_components/kit';
import { formatDateTime } from '../../_lib/format';
import { useApiList } from '../../_lib/use-api-list';

interface AuditEvent {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}
interface OrgUser {
  userAccountId: string;
  label: string;
}

export function AuditClient(): React.ReactElement {
  const [draft, setDraft] = useState({ action: '', entityType: '', from: '', to: '' });
  const [applied, setApplied] = useState(draft);
  const url = useMemo(() => {
    const p = new URLSearchParams({ limit: '200' });
    if (applied.action.trim()) p.set('action', applied.action.trim());
    if (applied.entityType.trim()) p.set('entityType', applied.entityType.trim());
    if (applied.from) p.set('from', new Date(`${applied.from}T00:00:00`).toISOString());
    if (applied.to) p.set('to', new Date(`${applied.to}T23:59:59`).toISOString());
    return `/api/v1/audit-events?${p.toString()}`;
  }, [applied]);
  const events = useApiList<AuditEvent>(url);
  const users = useApiList<OrgUser>('/api/v1/organisation-users');
  const who = useMemo(() => {
    const map = new Map(users.items.map((u) => [u.userAccountId, u.label]));
    return (id: string | null): string => (id ? (map.get(id) ?? 'User') : 'System');
  }, [users.items]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit log"
        lede="High-impact actions — approvals, money, roles, exports — recorded with who did them. Sensitive values are removed."
      />

      <form
        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(draft);
        }}
      >
        <Field label="Action" hint="Exact, e.g. finance.journal.posted">
          <Input value={draft.action} onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))} />
        </Field>
        <Field label="Entity type" hint="e.g. expense, journal">
          <Input
            value={draft.entityType}
            onChange={(e) => setDraft((d) => ({ ...d, entityType: e.target.value }))}
          />
        </Field>
        <Field label="From">
          <Input type="date" value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
        </Field>
        <Field label="To">
          <Input type="date" value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
        </Field>
        <Button type="submit" iconLeft="filter">
          Filter
        </Button>
      </form>

      <Panel title="Events" subtitle={events.loading ? 'Loading…' : `${events.items.length} shown · newest first`} flush>
        <ListState
          loading={events.loading}
          error={events.error}
          forbidden={events.forbidden}
          isEmpty={events.items.length === 0}
          onRetry={() => void events.reload()}
          empty={{ icon: 'shield', title: 'No matching events' }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>When</TH>
                  <TH>Who</TH>
                  <TH>Action</TH>
                  <TH>Entity</TH>
                  <TH>Details</TH>
                </TR>
              </THead>
              <TBody>
                {events.items.map((e) => (
                  <TR key={e.id}>
                    <TD className="whitespace-nowrap text-xs">{formatDateTime(e.createdAt)}</TD>
                    <TD className="text-sm">{who(e.actorUserId)}</TD>
                    <TD className="font-mono text-xs">{e.action}</TD>
                    <TD className="text-xs text-muted-foreground">
                      {e.entityType ?? '—'}
                      {e.entityId ? <div className="font-mono">{e.entityId.slice(0, 8)}</div> : null}
                    </TD>
                    <TD className="max-w-xs truncate font-mono text-xs text-muted-foreground">
                      {e.metadata && Object.keys(e.metadata).length > 0 ? JSON.stringify(e.metadata) : ''}
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
