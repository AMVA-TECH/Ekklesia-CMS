'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLoadEffect } from '@/app/_ekklesia/session';
import { Button, Metric } from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../console-header';
import { humanizePlatformError, platformApi } from '../platform-api';
import { useConsoleTab } from '../use-console-tab';

type Overview = {
  windowHours: number;
  environment: string;
  stores: {
    applicationLogs: { configured: boolean; detail: string };
    auditTrail: {
      configured: boolean;
      detail: string;
      events24h: number;
      href: string;
    };
    securityEvents: {
      configured: boolean;
      detail: string;
      openFindings: number;
      criticalFindings: number;
      authFailures24h: number;
      href: string;
    };
  };
  database: { ok: boolean; latencyMs: number; churches: number };
  sessions: { active: number };
  backgroundJobs: { byStatus: Record<string, number>; failed24h: number };
  deliveries: { byStatus: Record<string, number> };
  integrations: { failedWebhooks24h: number; href: string };
  provisioning: { failed24h: number };
  recentFailures: Array<{
    id: string;
    kind: string;
    status: string;
    detail: string | null;
    churchId: string | null;
    at: string;
  }>;
};

type JobRow = {
  id: string;
  churchName: string;
  channel: string;
  status: string;
  title: string | null;
  createdAt: string;
  completedAt: string | null;
};

type CorrelateResult = {
  requestId: string;
  applicationLogs: { configured: boolean; detail: string };
  auditEvents: Array<{
    id: string;
    action: string;
    outcome: string;
    requestId: string | null;
    createdAt: string;
    churchId: string | null;
  }>;
  webhookEvents: Array<{
    id: string;
    integrationCode: string;
    eventType: string;
    processingStatus: string;
    receivedAt: string;
  }>;
  securityHint: string;
};

const MONITORING_TABS = ['overview', 'jobs', 'correlate', 'logs'] as const;

export function MonitoringClient() {
  const [tab] = useConsoleTab(MONITORING_TABS, 'overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobStatus, setJobStatus] = useState('');
  const [requestId, setRequestId] = useState('');
  const [correlate, setCorrelate] = useState<CorrelateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshOverview = useCallback(async () => {
    const res = await platformApi<Overview>('/api/v1/platform/monitoring');
    setOverview(res);
  }, []);

  const refreshJobs = useCallback(async () => {
    const q = jobStatus ? `?status=${encodeURIComponent(jobStatus)}` : '';
    const res = await platformApi<{ items: JobRow[] }>(
      `/api/v1/platform/monitoring/jobs${q}`,
    );
    setJobs(res.items);
  }, [jobStatus]);

  useLoadEffect(() =>
    refreshOverview().catch((err: unknown) =>
      setError(humanizePlatformError(err)),
    ),
  );

  useEffect(() => {
    if (tab !== 'jobs') return;
    void refreshJobs().catch((err: unknown) =>
      setError(humanizePlatformError(err)),
    );
  }, [tab, refreshJobs]);

  async function onCorrelate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCorrelate(null);
    try {
      const res = await platformApi<CorrelateResult>(
        `/api/v1/platform/monitoring/correlate?requestId=${encodeURIComponent(requestId.trim())}`,
      );
      setCorrelate(res);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ConsoleHeader
        area="monitoring"
        tab={tab}
        title="System monitoring"
        description="Operational evidence from the database — jobs, webhooks, audit, and security stay separate. Application log aggregation is not invented."
      />

      {error ? <p className="platform-error">{error}</p> : null}

      {tab === 'overview' && overview ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Environment: <strong className="text-foreground">{overview.environment}</strong> · window{' '}
            {overview.windowHours}h
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Database"
              value={overview.database.ok ? 'up' : 'down'}
              icon="chart"
              tone={overview.database.ok ? 'sage' : 'peach'}
              hint={`${overview.database.latencyMs} ms · ${overview.database.churches} churches`}
            />
            <Metric
              label="Active sessions"
              value={overview.sessions.active}
              icon="users"
              tone="sky"
            />
            <Metric
              label="Failed jobs (24h)"
              value={overview.backgroundJobs.failed24h}
              icon="alert"
              tone="peach"
            />
            <Metric
              label="Failed webhooks (24h)"
              value={overview.integrations.failedWebhooks24h}
              icon="globe"
              tone="lavender"
            />
          </div>

          <section className="platform-panel p-4 space-y-3">
            <h2 className="text-lg font-semibold">Evidence stores</h2>
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-md border border-border p-3">
                <div className="font-medium">Application logs</div>
                <p className="platform-muted mt-1">
                  {overview.stores.applicationLogs.configured
                    ? 'Configured'
                    : 'Not configured'}
                </p>
                <p className="text-xs platform-muted mt-2">
                  {overview.stores.applicationLogs.detail}
                </p>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="font-medium">Audit trail</div>
                <p className="mt-1">
                  {overview.stores.auditTrail.events24h} events (24h)
                </p>
                <Link
                  className="text-xs underline"
                  href={overview.stores.auditTrail.href}
                >
                  Open Audit
                </Link>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="font-medium">Security events</div>
                <p className="mt-1">
                  {overview.stores.securityEvents.openFindings} open ·{' '}
                  {overview.stores.securityEvents.criticalFindings} critical ·{' '}
                  {overview.stores.securityEvents.authFailures24h} auth fails
                </p>
                <Link
                  className="text-xs underline"
                  href={overview.stores.securityEvents.href}
                >
                  Open Security
                </Link>
              </div>
            </div>
          </section>

          <section className="platform-panel">
            <div className="platform-panel-head">
              <h2>Recent failures</h2>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  void refreshOverview().catch((err: unknown) =>
                    setError(humanizePlatformError(err)),
                  )
                }
              >
                Refresh
              </Button>
            </div>
            <table className="platform-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentFailures.map((f) => (
                  <tr key={`${f.kind}-${f.id}`}>
                    <td className="text-xs">
                      {new Date(f.at).toLocaleString()}
                    </td>
                    <td>{f.kind}</td>
                    <td>{f.status}</td>
                    <td className="text-xs platform-muted">
                      {f.detail ?? f.kind}
                    </td>
                  </tr>
                ))}
                {overview.recentFailures.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="platform-muted py-4 text-center">
                      No failed jobs, webhooks, or provisioning in the window.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}

      {tab === 'jobs' ? (
        <section className="platform-panel space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="platform-muted">Status</span>
              <select
                className="platform-input mt-1 block"
                value={jobStatus}
                onChange={(e) => setJobStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="queued">queued</option>
                <option value="sending">sending</option>
                <option value="completed">completed</option>
                <option value="failed">failed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void refreshJobs().catch((err: unknown) =>
                  setError(humanizePlatformError(err)),
                )
              }
            >
              Refresh
            </Button>
          </div>
          <table className="platform-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Church</th>
                <th>Title</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td className="text-xs">
                    {new Date(j.createdAt).toLocaleString()}
                  </td>
                  <td>{j.channel}</td>
                  <td>{j.status}</td>
                  <td className="platform-muted text-xs">{j.churchName}</td>
                  <td className="text-xs">{j.title ?? '—'}</td>
                </tr>
              ))}
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="platform-muted py-4 text-center">
                    No message jobs in the last 7 days.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === 'correlate' ? (
        <section className="platform-panel space-y-4 p-4">
          <p className="text-sm platform-muted">
            Look up platform audit rows and webhook events by request /
            correlation id. Application logs cannot be attached until a log
            store is connected.
          </p>
          <form className="flex flex-wrap gap-2 items-end" onSubmit={onCorrelate}>
            <label className="text-sm grow min-w-[16rem]">
              <span className="platform-muted">Request / correlation id</span>
              <input
                className="platform-input mt-1 w-full"
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                required
                minLength={4}
              />
            </label>
            <Button type="submit" disabled={busy}>
              {busy ? 'Searching…' : 'Correlate'}
            </Button>
          </form>

          {correlate ? (
            <div className="space-y-4">
              <div className="rounded-md border border-border p-3 text-sm">
                <strong>Application logs</strong>
                <p className="platform-muted mt-1">
                  {correlate.applicationLogs.detail}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm">
                  Audit events ({correlate.auditEvents.length})
                </h3>
                <ul className="mt-1 space-y-1 text-xs">
                  {correlate.auditEvents.map((a) => (
                    <li key={a.id}>
                      {a.action} · {a.outcome} ·{' '}
                      {new Date(a.createdAt).toLocaleString()}
                    </li>
                  ))}
                  {correlate.auditEvents.length === 0 ? (
                    <li className="platform-muted">No audit hits.</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-sm">
                  Webhook events ({correlate.webhookEvents.length})
                </h3>
                <ul className="mt-1 space-y-1 text-xs">
                  {correlate.webhookEvents.map((w) => (
                    <li key={w.id}>
                      {w.integrationCode} · {w.eventType} ·{' '}
                      {w.processingStatus} ·{' '}
                      {new Date(w.receivedAt).toLocaleString()}
                    </li>
                  ))}
                  {correlate.webhookEvents.length === 0 ? (
                    <li className="platform-muted">No webhook hits.</li>
                  ) : null}
                </ul>
              </div>
              <p className="text-xs platform-muted">{correlate.securityHint}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'logs' ? (
        <section className="platform-panel p-6 space-y-3">
          <h2 className="text-lg font-semibold">Log explorer</h2>
          <p className="text-sm">
            <strong>Not configured.</strong> There is no centralized application
            log aggregation in this deployment.
          </p>
          <p className="text-sm platform-muted">
            Use <Link className="underline" href="/platform/audit">Audit</Link>{' '}
            for who-did-what,{' '}
            <Link className="underline" href="/platform/security">
              Security
            </Link>{' '}
            for findings, and Correlation above for request-id drill-down across
            audit + webhooks. Do not treat those as interchangeable with app
            logs.
          </p>
        </section>
      ) : null}
    </div>
  );
}
