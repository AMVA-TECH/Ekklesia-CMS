'use client';

import { FormEvent, useState } from 'react';
import { platformApi } from '../platform-api';

type AuditRow = {
  id: string;
  actorUserId: string | null;
  action: string;
  outcome: string;
  churchId: string | null;
  entityType: string;
  reason: string | null;
  createdAt: string;
};

export function AuditClient() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [action, setAction] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const qs = new URLSearchParams({ limit: '100' });
      if (action.trim()) qs.set('action', action.trim());
      const res = await platformApi<{ items: AuditRow[] }>(
        `/api/v1/platform/audit-events?${qs.toString()}`,
      );
      setItems(res.items);
      setLoaded(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <>
      <h1 className="platform-h1">Audit Explorer</h1>
      <p className="platform-lead">
        Immutable platform audit trail — CloudTrail / Admin Activity style search.
      </p>

      <form className="platform-panel" onSubmit={(e) => void onSearch(e)}>
        <div className="platform-panel-head">
          <h2>Filters</h2>
          <button type="submit" className="platform-btn platform-btn-primary">
            Search
          </button>
        </div>
        <div style={{ padding: '1rem' }}>
          <label className="platform-muted" htmlFor="action">
            Action (exact)
          </label>
          <input
            id="action"
            className="platform-input"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="platform.tenant.enter"
          />
        </div>
      </form>

      {error ? <p className="platform-error">{error}</p> : null}

      <section className="platform-panel">
        <div className="platform-panel-head">
          <h2>Events</h2>
          <span className="platform-muted">
            {loaded ? `${items.length} rows` : 'Run a search'}
          </span>
        </div>
        <table className="platform-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Outcome</th>
              <th>Actor</th>
              <th>Church</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="platform-muted">
                  {loaded ? 'No events match.' : 'No results yet.'}
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>{row.action}</td>
                  <td>{row.outcome}</td>
                  <td className="platform-muted">{row.actorUserId?.slice(0, 8) ?? '—'}</td>
                  <td className="platform-muted">{row.churchId?.slice(0, 8) ?? '—'}</td>
                  <td>{row.reason ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
