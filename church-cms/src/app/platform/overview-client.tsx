'use client';

import { useEffect, useState } from 'react';
import { platformApi } from './platform-api';

type Overview = {
  healthScore: number;
  findings: {
    open: number;
    critical: number;
    recent: Array<{
      id: string;
      severity: string;
      title: string;
      category: string;
      lastSeenAt: string;
    }>;
  };
  growth: {
    churchesTotal: number;
    peopleTotal: number;
    membershipsActive: number;
    attendanceCheckins7d: number;
    messagesSent7d: number;
  };
  fault: {
    failedMessageJobs7d: number;
    authFailures7d: number;
  };
};

export function OverviewClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    platformApi<Overview>('/api/v1/platform/overview')
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <h1 className="platform-h1">Platform overview</h1>
      <p className="platform-lead">
        Health, open security findings, and seven-day growth signals across every
        church on the platform.
      </p>

      {error ? <p className="platform-error">{error}</p> : null}
      {!data && !error ? <p className="platform-muted">Loading…</p> : null}

      {data ? (
        <>
          <div className="platform-grid">
            <div className="platform-stat">
              <p className="platform-stat-label">Health score</p>
              <p className="platform-stat-value">{data.healthScore}</p>
            </div>
            <div className="platform-stat">
              <p className="platform-stat-label">Open findings</p>
              <p className="platform-stat-value">{data.findings.open}</p>
            </div>
            <div className="platform-stat">
              <p className="platform-stat-label">Critical</p>
              <p className="platform-stat-value">{data.findings.critical}</p>
            </div>
            <div className="platform-stat">
              <p className="platform-stat-label">Churches</p>
              <p className="platform-stat-value">{data.growth.churchesTotal}</p>
            </div>
            <div className="platform-stat">
              <p className="platform-stat-label">People</p>
              <p className="platform-stat-value">{data.growth.peopleTotal}</p>
            </div>
            <div className="platform-stat">
              <p className="platform-stat-label">Active members</p>
              <p className="platform-stat-value">{data.growth.membershipsActive}</p>
            </div>
          </div>

          <div className="platform-actions">
            <a className="platform-btn platform-btn-primary" href="/security">
              Security Center
            </a>
            <a className="platform-btn" href="/audit">
              Audit Explorer
            </a>
            <a className="platform-btn" href="/fault">
              Fault response
            </a>
          </div>

          <section className="platform-panel">
            <div className="platform-panel-head">
              <h2>Recent open findings</h2>
              <span className="platform-muted">
                Auth fails 7d: {data.fault.authFailures7d} · Jobs failed:{' '}
                {data.fault.failedMessageJobs7d}
              </span>
            </div>
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {data.findings.recent.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="platform-muted">
                      No open findings.
                    </td>
                  </tr>
                ) : (
                  data.findings.recent.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <span className={`platform-badge ${f.severity}`}>
                          {f.severity}
                        </span>
                      </td>
                      <td>{f.title}</td>
                      <td>{f.category}</td>
                      <td>{new Date(f.lastSeenAt).toLocaleString()}</td>
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
