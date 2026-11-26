'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLoadEffect } from '@/app/_ekklesia/session';
import { Button } from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../console-header';
import {
  humanizePlatformError,
  platformApi,
} from '../platform-api';
import { useConsoleTab } from '../use-console-tab';

const ACCESS_TABS = ['operators', 'tenant', 'service', 'sessions'] as const;
type Tab = (typeof ACCESS_TABS)[number];

type Operator = {
  id: string;
  email: string | null;
  status: string;
  permissions: string[];
  createdAt: string;
  mfaEnabled?: boolean;
  activeSessionCount?: number;
};

type AccessSummary = {
  roleCounts: Array<{ churchName: string; roleCode: string; count: number }>;
  recentPrivilege: Array<{
    id: string;
    action: string;
    actorEmail: string;
    churchName: string;
    createdAt: string;
  }>;
};

type ChurchBrief = { id: string; name: string; slug: string; lifecycleStatus: string };

type TenantAccount = {
  userAccountId: string;
  displayName: string | null;
  email: string | null;
  accountStatus: string;
  orgLinkStatus: string;
  mfaEnabled: boolean;
  activeSessionCount: number;
};

type ServiceAccount = {
  id: string;
  name: string;
  purpose: string;
  status: string;
  scopes: string[];
  environment: string;
  credentialPrefix: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

type SessionRow = {
  id: string;
  email: string | null;
  name: string | null;
  expiresAt: string;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  activeChurchName: string;
};

export function AccessClient() {
  const [tab] = useConsoleTab(ACCESS_TABS, 'operators');
  const [operators, setOperators] = useState<Operator[]>([]);
  const [summary, setSummary] = useState<AccessSummary | null>(null);
  const [operatorEmail, setOperatorEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [churches, setChurches] = useState<ChurchBrief[]>([]);
  const [churchId, setChurchId] = useState('');
  const [tenantAccounts, setTenantAccounts] = useState<TenantAccount[]>([]);
  const [tenantNote, setTenantNote] = useState<string | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [tenantQ, setTenantQ] = useState('');
  const [tenantStatus, setTenantStatus] = useState('');
  const [operatorQ, setOperatorQ] = useState('');

  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccount[]>([]);
  const [saName, setSaName] = useState('');
  const [saPurpose, setSaPurpose] = useState('');
  const [issuedSecret, setIssuedSecret] = useState<string | null>(null);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [mfaNote, setMfaNote] = useState<string | null>(null);

  const refreshOperators = useCallback(async () => {
    const [ops, sum] = await Promise.all([
      platformApi<{ items: Operator[] }>('/api/v1/platform/operators'),
      platformApi<AccessSummary>('/api/v1/platform/access/summary'),
    ]);
    setOperators(ops.items);
    setSummary(sum);
  }, []);

  const refreshChurches = useCallback(async () => {
    const res = await platformApi<{ items: ChurchBrief[] }>(
      '/api/v1/platform/accounts/churches',
    );
    setChurches(res.items);
    if (res.items[0] && !churchId) setChurchId(res.items[0].id);
  }, [churchId]);

  const refreshTenantAccounts = useCallback(async () => {
    if (!churchId) {
      setTenantAccounts([]);
      return;
    }
    const qs = new URLSearchParams({ limit: '100' });
    if (tenantQ.trim()) qs.set('q', tenantQ.trim());
    if (tenantStatus) qs.set('status', tenantStatus);
    const res = await platformApi<{
      items: TenantAccount[];
      boundaryNote: string;
    }>(`/api/v1/platform/tenants/${churchId}/accounts?${qs}`);
    setTenantAccounts(res.items);
    setTenantNote(res.boundaryNote);
  }, [churchId, tenantQ, tenantStatus]);

  const refreshService = useCallback(async () => {
    const res = await platformApi<{ items: ServiceAccount[] }>(
      '/api/v1/platform/service-accounts',
    );
    setServiceAccounts(res.items);
  }, []);

  const refreshSessions = useCallback(async () => {
    const res = await platformApi<{
      items: SessionRow[];
      mfaRecoveryNote: string;
    }>('/api/v1/platform/sessions');
    setSessions(res.items);
    setMfaNote(res.mfaRecoveryNote);
  }, []);

  const loadInitial = useCallback(
    () =>
      refreshOperators().catch((err: unknown) =>
        setError(humanizePlatformError(err)),
      ),
    [refreshOperators],
  );
  useLoadEffect(loadInitial);

  useEffect(() => {
    let cancelled = false;
    async function loadTab() {
      try {
        if (tab === 'tenant') {
          await refreshChurches();
          if (!cancelled) await refreshTenantAccounts();
        } else if (tab === 'service') {
          await refreshService();
        } else if (tab === 'sessions') {
          await refreshSessions();
        }
      } catch (err: unknown) {
        if (!cancelled) setError(humanizePlatformError(err));
      }
    }
    void loadTab();
    return () => {
      cancelled = true;
    };
  }, [
    tab,
    churchId,
    refreshChurches,
    refreshTenantAccounts,
    refreshService,
    refreshSessions,
  ]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await platformApi('/api/v1/platform/operators', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: operatorEmail.trim() }),
      });
      setOperatorEmail('');
      await refreshOperators();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    }
  }

  async function patchOpStatus(op: Operator, status: 'active' | 'suspended') {
    const reason = window.prompt('Reason for this change (min 8 chars):');
    if (!reason || reason.trim().length < 8) return;
    setBusy(true);
    setError(null);
    try {
      await platformApi(`/api/v1/platform/operators/${op.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, reason: reason.trim() }),
      });
      await refreshOperators();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function revokeOpSessions(op: Operator) {
    if (!window.confirm(`Revoke all sessions for ${op.email ?? 'this operator'}?`)) {
      return;
    }
    setBusy(true);
    try {
      await platformApi(`/api/v1/platform/operators/${op.id}/revoke-sessions`, {
        method: 'POST',
      });
      await refreshOperators();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function patchTenantStatus(
    account: TenantAccount,
    status: 'active' | 'suspended' | 'locked',
  ) {
    if (statusReason.trim().length < 8) {
      setError('Enter a reason (at least 8 characters) before changing status.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await platformApi(
        `/api/v1/platform/tenants/${churchId}/accounts/${account.userAccountId}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status, reason: statusReason.trim() }),
        },
      );
      await refreshTenantAccounts();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function revokeTenantSessions(account: TenantAccount) {
    setBusy(true);
    try {
      await platformApi(
        `/api/v1/platform/tenants/${churchId}/accounts/${account.userAccountId}/revoke-sessions`,
        { method: 'POST' },
      );
      await refreshTenantAccounts();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onCreateService(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIssuedSecret(null);
    setBusy(true);
    try {
      const res = await platformApi<{ secret: string }>(
        '/api/v1/platform/service-accounts',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: saName.trim(),
            purpose: saPurpose.trim(),
            scopes: [],
            environment: 'all',
          }),
        },
      );
      setIssuedSecret(res.secret);
      setSaName('');
      setSaPurpose('');
      await refreshService();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function rotateService(id: string) {
    const reason = window.prompt('Reason for rotation (min 8 chars):');
    if (!reason || reason.trim().length < 8) return;
    setBusy(true);
    setIssuedSecret(null);
    try {
      const res = await platformApi<{ secret: string }>(
        `/api/v1/platform/service-accounts/${id}/rotate`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      setIssuedSecret(res.secret);
      await refreshService();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function revokeService(id: string) {
    const reason = window.prompt('Reason for revoke (min 8 chars):');
    if (!reason || reason.trim().length < 8) return;
    setBusy(true);
    try {
      await platformApi(`/api/v1/platform/service-accounts/${id}/revoke`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      await refreshService();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ConsoleHeader
        area="access"
        tab={tab}
        title="Accounts & access"
        description="Platform personnel, tenant technical accounts, and service identities. Church membership and RBAC stay under church governance."
      />

      {error ? <p className="platform-error">{error}</p> : null}

      {tab === 'operators' ? (
        <>
          <form className="platform-panel" onSubmit={(e) => void onAdd(e)}>
            <div className="platform-panel-head">
              <h2>Add platform operator</h2>
              <button type="submit" className="platform-btn platform-btn-primary">
                Add
              </button>
            </div>
            <div style={{ padding: '1rem' }}>
              <label className="platform-muted" htmlFor="operatorEmail">
                Existing user email
              </label>
              <input
                id="operatorEmail"
                type="email"
                className="platform-input"
                value={operatorEmail}
                onChange={(e) => setOperatorEmail(e.target.value)}
                required
                placeholder="admin@example.com"
              />
            </div>
          </form>

          <section className="platform-panel">
            <div className="platform-panel-head">
              <h2>Operators</h2>
              <input
                className="platform-input max-w-xs"
                value={operatorQ}
                onChange={(e) => setOperatorQ(e.target.value)}
                placeholder="Filter by email…"
                aria-label="Filter operators"
              />
            </div>
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>MFA</th>
                  <th>Sessions</th>
                  <th>Permissions</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {operators
                  .filter((op) => {
                    const needle = operatorQ.trim().toLowerCase();
                    if (!needle) return true;
                    return (op.email ?? '').toLowerCase().includes(needle);
                  })
                  .map((op) => (
                  <tr key={op.id}>
                    <td>
                      <Link
                        href={`/platform/access/operators/${op.id}`}
                        className="font-medium hover:text-[color:var(--brand-gold-ink)]"
                      >
                        {op.email ?? '—'}
                      </Link>
                    </td>
                    <td>{op.status}</td>
                    <td>{op.mfaEnabled ? 'on' : 'off'}</td>
                    <td>{op.activeSessionCount ?? 0}</td>
                    <td className="platform-muted text-xs">
                      {(op.permissions ?? []).join(', ')}
                    </td>
                    <td className="space-x-1 whitespace-nowrap">
                      {op.status === 'active' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void patchOpStatus(op, 'suspended')}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void patchOpStatus(op, 'active')}
                        >
                          Restore
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void revokeOpSessions(op)}
                      >
                        Revoke sessions
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="platform-panel">
            <div className="platform-panel-head">
              <h2>Role counts by church</h2>
            </div>
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Church</th>
                  <th>Role</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.roleCounts ?? []).map((r, i) => (
                  <tr key={`${r.churchName}-${r.roleCode}-${i}`}>
                    <td>{r.churchName}</td>
                    <td>{r.roleCode}</td>
                    <td>{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="platform-panel">
            <div className="platform-panel-head">
              <h2>Recent privilege events</h2>
            </div>
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.recentPrivilege ?? []).map((r) => (
                  <tr key={r.id}>
                    <td>{r.action}</td>
                    <td className="platform-muted">{r.actorEmail}</td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {tab === 'tenant' ? (
        <section className="platform-panel space-y-3 p-4">
          <p className="text-sm platform-muted">
            {tenantNote ??
              'Technical account lifecycle only — no membership or church role edits.'}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="platform-muted">Church tenant</span>
              <select
                className="platform-input mt-1 w-full min-w-[14rem] max-w-md"
                value={churchId}
                onChange={(e) => {
                  setChurchId(e.target.value);
                }}
              >
                {churches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug}) · {c.lifecycleStatus}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="platform-muted">Search</span>
              <input
                className="platform-input mt-1"
                value={tenantQ}
                onChange={(e) => setTenantQ(e.target.value)}
                placeholder="Name, email…"
              />
            </label>
            <label className="block text-sm">
              <span className="platform-muted">Status</span>
              <select
                className="platform-input mt-1"
                value={tenantStatus}
                onChange={(e) => setTenantStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="active">active</option>
                <option value="suspended">suspended</option>
                <option value="locked">locked</option>
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                void refreshTenantAccounts().catch((err: unknown) =>
                  setError(humanizePlatformError(err)),
                )
              }
            >
              Apply
            </Button>
          </div>
          <label className="block text-sm max-w-md">
            <span className="platform-muted">Reason for status changes</span>
            <input
              className="platform-input mt-1 w-full"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Required before suspend/lock/restore"
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refreshTenantAccounts()}
            >
              Refresh
            </Button>
          </div>
          <table className="platform-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Status</th>
                <th>MFA</th>
                <th>Sessions</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tenantAccounts.map((a) => (
                <tr key={a.userAccountId}>
                  <td>
                    <div>{a.displayName ?? a.email ?? '—'}</div>
                    <div className="platform-muted text-xs">{a.email}</div>
                  </td>
                  <td>
                    {a.accountStatus}
                    <span className="platform-muted text-xs">
                      {' '}
                      / org {a.orgLinkStatus}
                    </span>
                  </td>
                  <td>{a.mfaEnabled ? 'on' : 'off'}</td>
                  <td>{a.activeSessionCount}</td>
                  <td className="space-x-1 whitespace-nowrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void patchTenantStatus(a, 'suspended')}
                    >
                      Suspend
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void patchTenantStatus(a, 'locked')}
                    >
                      Lock
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void patchTenantStatus(a, 'active')}
                    >
                      Restore
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void revokeTenantSessions(a)}
                    >
                      Revoke sessions
                    </Button>
                  </td>
                </tr>
              ))}
              {tenantAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="platform-muted py-4 text-center">
                    No accounts for this tenant (or select a church).
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === 'service' ? (
        <>
          {issuedSecret ? (
            <div className="platform-status platform-status-success" role="status">
              <div>
                <strong>Service credential issued once</strong>
                <p>
                  Secret: <code>{issuedSecret}</code>
                </p>
                <p>Store securely — it will not be shown again.</p>
              </div>
            </div>
          ) : null}
          <form
            className="platform-panel"
            onSubmit={(e) => void onCreateService(e)}
          >
            <div className="platform-panel-head">
              <h2>Create service account</h2>
              <button
                type="submit"
                className="platform-btn platform-btn-primary"
                disabled={busy}
              >
                Create
              </button>
            </div>
            <div style={{ padding: '1rem' }} className="platform-form-row two">
              <div>
                <label className="platform-muted" htmlFor="sa-name">
                  Name (slug)
                </label>
                <input
                  id="sa-name"
                  className="platform-input"
                  value={saName}
                  onChange={(e) => setSaName(e.target.value)}
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="notify-worker"
                />
              </div>
              <div>
                <label className="platform-muted" htmlFor="sa-purpose">
                  Purpose
                </label>
                <input
                  id="sa-purpose"
                  className="platform-input"
                  value={saPurpose}
                  onChange={(e) => setSaPurpose(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>
          </form>
          <section className="platform-panel">
            <div className="platform-panel-head">
              <h2>Service accounts</h2>
            </div>
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Env</th>
                  <th>Prefix</th>
                  <th>Last used</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {serviceAccounts.map((sa) => (
                  <tr key={sa.id}>
                    <td>
                      <div className="font-medium">{sa.name}</div>
                      <div className="platform-muted text-xs">{sa.purpose}</div>
                    </td>
                    <td>{sa.status}</td>
                    <td>{sa.environment}</td>
                    <td className="platform-muted">
                      {sa.credentialPrefix ?? '—'}
                    </td>
                    <td>
                      {sa.lastUsedAt
                        ? new Date(sa.lastUsedAt).toLocaleString()
                        : 'never'}
                    </td>
                    <td className="space-x-1 whitespace-nowrap">
                      {sa.status !== 'revoked' ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => void rotateService(sa.id)}
                          >
                            Rotate
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void revokeService(sa.id)}
                          >
                            Revoke
                          </Button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {serviceAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="platform-muted py-4 text-center">
                      No service accounts yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {tab === 'sessions' ? (
        <section className="platform-panel space-y-3 p-4">
          {mfaNote ? (
            <p className="text-sm platform-muted">{mfaNote}</p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => void refreshSessions()}
          >
            Refresh
          </Button>
          <table className="platform-table">
            <thead>
              <tr>
                <th>User</th>
                <th>IP</th>
                <th>Created</th>
                <th>Expires</th>
                <th>Active church</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.email ?? s.name ?? '—'}</td>
                  <td className="platform-muted">{s.ipAddress ?? '—'}</td>
                  <td>{new Date(s.createdAt).toLocaleString()}</td>
                  <td>{new Date(s.expiresAt).toLocaleString()}</td>
                  <td className="platform-muted">{s.activeChurchName}</td>
                </tr>
              ))}
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="platform-muted py-4 text-center">
                    No active Better Auth sessions.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}
