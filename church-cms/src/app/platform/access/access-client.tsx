'use client';

import { FormEvent, useEffect, useState } from 'react';
import { platformApi } from '../platform-api';

type Operator = {
  id: string;
  userAccountId: string;
  email: string | null;
  status: string;
  permissions: string[];
  createdAt: string;
};

type AccessSummary = {
  roleCounts: Array<{ churchId: string; roleCode: string; count: number }>;
  recentPrivilege: Array<{
    id: string;
    action: string;
    actorUserId: string | null;
    churchId: string | null;
    createdAt: string;
  }>;
};

export function AccessClient() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [summary, setSummary] = useState<AccessSummary | null>(null);
  const [userAccountId, setUserAccountId] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [ops, sum] = await Promise.all([
      platformApi<{ items: Operator[] }>('/api/v1/platform/operators'),
      platformApi<AccessSummary>('/api/v1/platform/access/summary'),
    ]);
    setOperators(ops.items);
    setSummary(sum);
  }

  useEffect(() => {
    refresh().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : 'Failed'),
    );
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await platformApi('/api/v1/platform/operators', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userAccountId }),
      });
      setUserAccountId('');
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <>
      <h1 className="platform-h1">Access control</h1>
      <p className="platform-lead">
        Platform operators and recent privilege changes across churches.
      </p>

      {error ? <p className="platform-error">{error}</p> : null}

      <form className="platform-panel" onSubmit={(e) => void onAdd(e)}>
        <div className="platform-panel-head">
          <h2>Add platform operator</h2>
          <button type="submit" className="platform-btn platform-btn-primary">
            Add
          </button>
        </div>
        <div style={{ padding: '1rem' }}>
          <label className="platform-muted" htmlFor="userAccountId">
            User account UUID
          </label>
          <input
            id="userAccountId"
            className="platform-input"
            value={userAccountId}
            onChange={(e) => setUserAccountId(e.target.value)}
            required
            pattern="[0-9a-fA-F-]{36}"
          />
        </div>
      </form>

      <section className="platform-panel">
        <div className="platform-panel-head">
          <h2>Operators</h2>
        </div>
        <table className="platform-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>User</th>
              <th>Status</th>
              <th>Permissions</th>
            </tr>
          </thead>
          <tbody>
            {operators.map((op) => (
              <tr key={op.id}>
                <td>{op.email ?? '—'}</td>
                <td className="platform-muted">{op.userAccountId}</td>
                <td>{op.status}</td>
                <td className="platform-muted">
                  {(op.permissions ?? []).join(', ')}
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
              <tr key={`${r.churchId}-${r.roleCode}-${i}`}>
                <td className="platform-muted">{r.churchId.slice(0, 8)}</td>
                <td>{r.roleCode}</td>
                <td>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
