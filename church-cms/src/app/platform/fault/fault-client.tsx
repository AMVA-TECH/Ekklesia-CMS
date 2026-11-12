'use client';

import { useEffect, useState } from 'react';
import { platformApi } from '../platform-api';

type Health = {
  windowHours: number;
  failedMessageJobs: number;
  authFailures: number;
  openFindings: number;
  criticalFindings: number;
  runbooks: string[];
};

export function FaultClient() {
  const [data, setData] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    platformApi<Health>('/api/v1/platform/health')
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed'),
      );
  }, []);

  return (
    <>
      <h1 className="platform-h1">Fault response</h1>
      <p className="platform-lead">
        Operational signals for the last {data?.windowHours ?? 24} hours — start
        here when something breaks.
      </p>

      {error ? <p className="platform-error">{error}</p> : null}

      {data ? (
        <>
          <div className="platform-grid">
            <div className="platform-stat">
              <p className="platform-stat-label">Failed message jobs</p>
              <p className="platform-stat-value">{data.failedMessageJobs}</p>
            </div>
            <div className="platform-stat">
              <p className="platform-stat-label">Auth failures</p>
              <p className="platform-stat-value">{data.authFailures}</p>
            </div>
            <div className="platform-stat">
              <p className="platform-stat-label">Open findings</p>
              <p className="platform-stat-value">{data.openFindings}</p>
            </div>
            <div className="platform-stat">
              <p className="platform-stat-label">Critical findings</p>
              <p className="platform-stat-value">{data.criticalFindings}</p>
            </div>
          </div>

          <section className="platform-panel">
            <div className="platform-panel-head">
              <h2>Runbooks</h2>
            </div>
            <ul style={{ margin: 0, padding: '1rem 1rem 1rem 2rem' }}>
              {data.runbooks.map((rb) => (
                <li key={rb} className="platform-muted" style={{ marginBottom: '0.35rem' }}>
                  {rb}
                </li>
              ))}
              <li className="platform-muted">
                Contain → assess audit trail → fix → notify → post-incident note
                (docs/04-security.md §14)
              </li>
            </ul>
          </section>
        </>
      ) : null}
    </>
  );
}
