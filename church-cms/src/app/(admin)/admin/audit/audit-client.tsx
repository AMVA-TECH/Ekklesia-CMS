'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('AdminPages');
  const ta = useTranslations('AdminAudit');
  const tc = useTranslations('Common');
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
    return (id: string | null): string =>
      id ? (map.get(id) ?? ta('user')) : ta('system');
  }, [users.items, ta]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('auditLog')} lede={t('auditLogLede')} />

      <form
        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(draft);
        }}
      >
        <Field label={ta('action')} hint={ta('actionHint')}>
          <Input value={draft.action} onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))} />
        </Field>
        <Field label={ta('entityType')} hint={ta('entityHint')}>
          <Input
            value={draft.entityType}
            onChange={(e) => setDraft((d) => ({ ...d, entityType: e.target.value }))}
          />
        </Field>
        <Field label={ta('from')}>
          <Input type="date" value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
        </Field>
        <Field label={ta('to')}>
          <Input type="date" value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
        </Field>
        <Button type="submit" iconLeft="filter">
          {ta('filter')}
        </Button>
      </form>

      <Panel
        title={ta('events')}
        subtitle={
          events.loading
            ? tc('loading')
            : ta('shownNewest', { count: events.items.length })
        }
        flush
      >
        <ListState
          loading={events.loading}
          error={events.error}
          forbidden={events.forbidden}
          isEmpty={events.items.length === 0}
          onRetry={() => void events.reload()}
          empty={{ icon: 'shield', title: ta('noMatching') }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{ta('when')}</TH>
                  <TH>{ta('who')}</TH>
                  <TH>{ta('action')}</TH>
                  <TH>{ta('entity')}</TH>
                  <TH>{ta('details')}</TH>
                </TR>
              </THead>
              <TBody>
                {events.items.map((e) => (
                  <TR key={e.id}>
                    <TD className="whitespace-nowrap text-xs">{formatDateTime(e.createdAt)}</TD>
                    <TD className="text-sm">{who(e.actorUserId)}</TD>
                    <TD className="font-mono text-xs">{e.action}</TD>
                    <TD className="text-xs text-muted-foreground">
                      {e.entityType ?? ta('emDash')}
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
