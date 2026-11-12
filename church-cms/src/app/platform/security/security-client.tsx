'use client';

import { useCallback, useEffect, useState } from 'react';
import { platformApi } from '../platform-api';

type Finding = {
  id: string;
  severity: string;
  category: string;
  title: string;
  status: string;
  churchId: string | null;
  detectorKey: string;
  lastSeenAt: string;
};

export function SecurityClient() {
  const [items, setItems] = useState<Finding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await platformApi<{ items: Finding[] }>(
      '/api/v1/platform/security-findings?limit=100',
    );
    setItems(res.items);
  }, []);

  useEffect(() => {
    load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : 'Failed'),
    );
  }, [load]);

  async function runDetectors() {
    setBusy(true);
    setError(null);
    try {
      await platformApi('/api/v1/platform/security-findings', { method: 'POST' });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: 'ack' | 'resolved' | 'open') {
    setBusy(true);
    try {
      await platformApi(`/api/v1/platform/security-findings/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="platform-h1">Security Center</h1>
      <p className="platform-lead">
        Findings from rule-based detectors — triage like AWS Security Hub / Google
        SCC.
      </p>

      <div className="platform-actions">
        <button
          type="button"
          className="platform-btn platform-btn-primary"
          disabled={busy}
          onClick={() => void runDetectors()}
        >
          Run detectors
        </button>
        <button
          type="button"
          className="platform-btn"
          disabled={busy}
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      {error ? <p className="platform-error">{error}</p> : null}

      <section className="platform-panel">
        <div className="platform-panel-head">
          <h2>Findings queue</h2>
          <span className="platform-muted">{items.length} rows</span>
        </div>
        <table className="platform-table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Title</th>
              <th>Status</th>
              <th>Detector</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="platform-muted">
                  No findings yet. Run detectors to scan.
                </td>
              </tr>
            ) : (
              items.map((f) => (
                <tr key={f.id}>
                  <td>
                    <span className={`platform-badge ${f.severity}`}>
                      {f.severity}
                    </span>
                  </td>
                  <td>
                    <div>{f.title}</div>
                    <div className="platform-muted">{f.category}</div>
                  </td>
                  <td>{f.status}</td>
                  <td className="platform-muted">{f.detectorKey}</td>
                  <td>
                    <div className="platform-actions" style={{ margin: 0 }}>
                      <button
                        type="button"
                        className="platform-btn"
                        disabled={busy}
                        onClick={() => void setStatus(f.id, 'ack')}
                      >
                        Ack
                      </button>
                      <button
                        type="button"
                        className="platform-btn"
                        disabled={busy}
                        onClick={() => void setStatus(f.id, 'resolved')}
                      >
                        Resolve
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
