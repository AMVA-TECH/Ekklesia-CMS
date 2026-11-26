'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLoadEffect } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../console-header';
import { humanizePlatformError, platformApi } from '../platform-api';

type Scope = 'platform' | 'tenant';
type PurgeScope = 'platform' | 'tenant' | 'all';

type AuditRow = {
  id: string;
  scope: Scope;
  actorEmail: string;
  action: string;
  outcome: string;
  churchName: string;
  churchId: string | null;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  requestId: string | null;
  href: string;
  relatedHref: string | null;
  createdAt: string;
};

export function AuditClient() {
  const searchParams = useSearchParams();
  const scopeParam = searchParams.get('scope');
  const scope: Scope = scopeParam === 'tenant' ? 'tenant' : 'platform';

  const [items, setItems] = useState<AuditRow[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [churches, setChurches] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [churchId, setChurchId] = useState('');
  const [outcome, setOutcome] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [purgeScope, setPurgeScope] = useState<PurgeScope>('platform');
  const [purgeBefore, setPurgeBefore] = useState('');
  const [purgeReason, setPurgeReason] = useState('');
  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [purgePin, setPurgePin] = useState('');
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);

  useLoadEffect(
    useCallback(() => {
      platformApi<{ isAdmin: boolean }>('/api/v1/platform/me')
        .then((res) => setIsAdmin(res.isAdmin))
        .catch(() => setIsAdmin(false));
    }, []),
  );

  const runSearch = useCallback(
    async (overrides?: { q?: string; scope?: Scope }) => {
      setBusy(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          limit: '100',
          scope: overrides?.scope ?? scope,
        });
        const query = overrides?.q ?? q;
        if (query.trim()) qs.set('q', query.trim());
        if (action.trim()) qs.set('action', action.trim());
        if (entityType.trim()) qs.set('entityType', entityType.trim());
        if (churchId) qs.set('churchId', churchId);
        if (outcome) qs.set('outcome', outcome);
        if (from) qs.set('from', new Date(`${from}T00:00:00.000Z`).toISOString());
        if (to) qs.set('to', new Date(`${to}T23:59:59.999Z`).toISOString());
        const res = await platformApi<{
          items: AuditRow[];
          entityTypes: string[];
          churches: Array<{ id: string; name: string }>;
        }>(`/api/v1/platform/audit-events?${qs.toString()}`);
        setItems(res.items);
        setEntityTypes(res.entityTypes);
        setChurches(res.churches);
        setLoaded(true);
      } catch (err: unknown) {
        setError(humanizePlatformError(err));
      } finally {
        setBusy(false);
      }
    },
    [action, churchId, entityType, from, outcome, q, scope, to],
  );

  useEffect(() => {
    const initialQ = searchParams.get('q');
    if (initialQ) setQ(initialQ);
    void runSearch({ q: initialQ ?? undefined, scope });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate when scope/URL changes
  }, [scope, searchParams]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await runSearch();
  }

  async function onPurge(e: FormEvent) {
    e.preventDefault();
    if (purgeConfirm !== 'DELETE') {
      setError('Type DELETE exactly to confirm permanent deletion.');
      return;
    }
    if (
      !window.confirm(
        'This permanently deletes audit rows from the database. A single purge attestation is written afterwards. Continue?',
      )
    ) {
      return;
    }
    setPurging(true);
    setError(null);
    setPurgeResult(null);
    try {
      const body: {
        scope: PurgeScope;
        reason: string;
        confirm: 'DELETE';
        pin: string;
        before?: string;
      } = {
        scope: purgeScope,
        reason: purgeReason.trim(),
        confirm: 'DELETE',
        pin: purgePin,
      };
      if (purgeBefore) {
        body.before = new Date(`${purgeBefore}T23:59:59.999Z`).toISOString();
      }
      const res = await platformApi<{
        deletedPlatform: number;
        deletedTenant: number;
        deletedTotal: number;
      }>('/api/v1/platform/audit-events/purge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      setPurgeResult(
        `Deleted ${res.deletedTotal} rows (platform ${res.deletedPlatform}, tenant ${res.deletedTenant}).`,
      );
      setPurgePin('');
      setPurgeConfirm('');
      setPurgeReason('');
      await runSearch();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setPurging(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ConsoleHeader
        area="audit"
        tab={scope}
        title="Audit"
        description="Activity trail for platform operators and church-plane tenant users. Open a row to drill into sanitized metadata and related events."
      />

      <Panel title="Filters">
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => void onSearch(e)}
        >
          <label className="text-sm lg:col-span-2">
            <span className="text-muted-foreground">
              Search (action, reason, id, request)
            </span>
            <input
              className="platform-input mt-1"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="platform.tenant.enter"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Exact action</span>
            <input
              className="platform-input mt-1"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Entity type</span>
            <select
              className="platform-select mt-1"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              <option value="">All types</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          {scope === 'platform' ? (
            <label className="text-sm">
              <span className="text-muted-foreground">Outcome</span>
              <select
                className="platform-select mt-1"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                <option value="">Any</option>
                <option value="success">success</option>
                <option value="failure">failure</option>
                <option value="denied">denied</option>
              </select>
            </label>
          ) : null}
          <label className="text-sm">
            <span className="text-muted-foreground">Church</span>
            <select
              className="platform-select mt-1"
              value={churchId}
              onChange={(e) => setChurchId(e.target.value)}
            >
              <option value="">All churches</option>
              {churches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">From</span>
            <input
              type="date"
              className="platform-input mt-1"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">To</span>
            <input
              type="date"
              className="platform-input mt-1"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <Button type="submit" size="sm" disabled={busy}>
              Search
            </Button>
          </div>
        </form>
      </Panel>

      {error ? <p className="platform-error">{error}</p> : null}
      {purgeResult ? (
        <p className="rounded-card bg-[color:var(--sage-soft)] px-4 py-3 text-sm text-[color:var(--sage-ink)]">
          {purgeResult}
        </p>
      ) : null}

      {isAdmin ? (
        <Panel
          title="Delete logs from database"
          subtitle="Irreversible. platform:admin only · PIN + type DELETE. Optional cut-off keeps newer rows."
        >
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => void onPurge(e)}>
            <label className="block text-sm">
              <span className="text-muted-foreground">Scope</span>
              <select
                className="platform-select mt-1"
                value={purgeScope}
                onChange={(e) => setPurgeScope(e.target.value as PurgeScope)}
              >
                <option value="platform">Platform operator logs</option>
                <option value="tenant">Tenant / church logs</option>
                <option value="all">Both (complete wipe in scope)</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">
                Only older than (optional)
              </span>
              <input
                type="date"
                className="platform-input mt-1"
                value={purgeBefore}
                onChange={(e) => setPurgeBefore(e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-muted-foreground">Reason</span>
              <input
                className="platform-input mt-1"
                value={purgeReason}
                onChange={(e) => setPurgeReason(e.target.value)}
                required
                minLength={8}
                placeholder="Staging reset after load test"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">
                Type DELETE to confirm
              </span>
              <input
                className="platform-input mt-1"
                value={purgeConfirm}
                onChange={(e) => setPurgeConfirm(e.target.value)}
                required
                autoComplete="off"
                placeholder="DELETE"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Your PIN</span>
              <input
                type="password"
                inputMode="numeric"
                className="platform-input mt-1"
                value={purgePin}
                onChange={(e) => setPurgePin(e.target.value)}
                required
                minLength={4}
                maxLength={8}
                autoComplete="current-password"
              />
            </label>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={purging || purgeConfirm !== 'DELETE'}
              >
                Permanently delete logs
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Leave the date empty to delete every matching row. One
                platform.audit.purged attestation is written after the wipe.
              </p>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel
        title={scope === 'tenant' ? 'Tenant events' : 'Platform events'}
        subtitle={`${items.length} rows`}
        flush
      >
        {!loaded && items.length === 0 ? (
          <EmptyState
            icon="file"
            tone="neutral"
            title="No results yet"
            description="Apply filters to search the audit trail."
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="file"
            tone="neutral"
            title="No events match"
            description="Try a wider date range or clear filters."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Action</TH>
                  <TH>Outcome</TH>
                  <TH>Actor</TH>
                  <TH>Church</TH>
                  <TH>Entity</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {items.map((row) => (
                  <TR key={row.id}>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </TD>
                    <TD>
                      <Link
                        href={row.href}
                        className="font-medium hover:underline"
                      >
                        {row.action}
                      </Link>
                    </TD>
                    <TD>
                      <Badge
                        tone={
                          row.outcome === 'success'
                            ? 'sage'
                            : row.outcome === 'denied'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {row.outcome}
                      </Badge>
                    </TD>
                    <TD className="text-muted-foreground">{row.actorEmail}</TD>
                    <TD className="text-muted-foreground">
                      {row.churchId ? (
                        <Link
                          href={`/platform/churches/${row.churchId}`}
                          className="hover:underline"
                        >
                          {row.churchName}
                        </Link>
                      ) : (
                        row.churchName
                      )}
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {row.entityType}
                      {row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ''}
                    </TD>
                    <TD>
                      <Link
                        href={row.href}
                        className="text-sm font-medium text-[color:var(--brand-gold-ink)] hover:underline"
                      >
                        Open
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
