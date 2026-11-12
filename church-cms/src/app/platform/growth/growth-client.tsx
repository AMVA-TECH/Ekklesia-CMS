'use client';

import { useEffect, useState } from 'react';
import { platformApi } from '../platform-api';

type Growth = {
  days: number;
  live: {
    churchesTotal: number;
    peopleTotal: number;
    membershipsActive: number;
    attendanceCheckins7d: number;
    messagesSent7d: number;
  };
  series: Record<string, Array<{ date: string; value: number }>>;
};

export function GrowthClient() {
  const [data, setData] = useState<Growth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await platformApi<Growth>('/api/v1/platform/growth?days=30');
    setData(res);
  }

  useEffect(() => {
    load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : 'Failed'),
    );
  }, []);

  async function snapshot() {
    setBusy(true);
    setError(null);
    try {
      await platformApi('/api/v1/platform/metrics/snapshot', { method: 'POST' });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="platform-h1">Platform growth</h1>
      <p className="platform-lead">
        Live totals and daily metric snapshots for platform adoption.
      </p>

      <div className="platform-actions">
        <button
          type="button"
          className="platform-btn platform-btn-primary"
          disabled={busy}
          onClick={() => void snapshot()}
        >
          Write today&apos;s snapshot
        </button>
      </div>

      {error ? <p className="platform-error">{error}</p> : null}

      {data ? (
        <>
          <div className="platform-grid">
            <div className="platform-stat">
              <p className="platform-stat-label">Churches</p>
              <p className="platform-stat-value">{data.live.churchesTotal}</p>
            </div>
            <div className="platform-stat">
              <p className="platform-stat-label">People</p>
              <p className="platform-stat-value">{data.live.peopleTotal}</p>
            </div>
            <div className="platform-stat">
              <p className="platform-stat-label">Active memberships</p>
              <p className="platform-stat-value">{data.live.membershipsActive}</p>
            </div>
            <div className="platform-stat">
              <p className="platform-stat-label">Check-ins (7d)</p>
              <p className="platform-stat-value">{data.live.attendanceCheckins7d}</p>
            </div>
            <div className="platform-stat">
              <p className="platform-stat-label">Messages (7d)</p>
              <p className="platform-stat-value">{data.live.messagesSent7d}</p>
            </div>
          </div>

          <section className="platform-panel">
            <div className="platform-panel-head">
              <h2>Snapshot series (churches_total)</h2>
            </div>
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {(data.series.churches_total ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={2} className="platform-muted">
                      No snapshots yet. Write today&apos;s snapshot.
                    </td>
                  </tr>
                ) : (
                  (data.series.churches_total ?? []).map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </>
  );
}
