'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLoadEffect } from '@/app/_ekklesia/session';
import { Button } from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../console-header';
import { humanizePlatformError, platformApi } from '../platform-api';
import { useConsoleTab } from '../use-console-tab';

type Integration = {
  id: string;
  code: string;
  name: string;
  category: string;
  scope: string;
  description: string | null;
  health: string;
  configSummary: Record<string, unknown>;
  evidence: {
    webhook: { succeeded: number; failed: number; total: number };
    deliveries24h?: {
      sent: number;
      delivered: number;
      failed: number;
      total: number;
    };
  };
};

type WebhookRow = {
  id: string;
  integrationCode: string;
  direction: string;
  eventType: string;
  processingStatus: string;
  httpStatus: number | null;
  receivedAt: string;
  retryCount: number;
  errorMessage: string | null;
  durationMs: number | null;
  correlationId: string | null;
};

type WebhookDetail = {
  event: WebhookRow & {
    payloadRedacted: Record<string, unknown>;
    churchId: string | null;
  };
  attempts: Array<{
    id: string;
    attemptNumber: number;
    outcome: string;
    httpStatus: number | null;
    durationMs: number | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
};

function healthClass(health: string): string {
  if (health === 'operational') return 'text-emerald-700';
  if (health === 'degraded') return 'text-amber-700';
  if (health === 'unavailable') return 'text-danger';
  return 'platform-muted';
}

const INTEGRATION_TABS = ['directory', 'webhooks'] as const;

export function IntegrationsClient() {
  const [tab] = useConsoleTab(INTEGRATION_TABS, 'directory');
  const [items, setItems] = useState<Integration[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WebhookDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshDirectory = useCallback(async () => {
    const res = await platformApi<{ items: Integration[]; note: string }>(
      '/api/v1/platform/integrations',
    );
    setItems(res.items);
    setNote(res.note);
  }, []);

  const refreshWebhooks = useCallback(async () => {
    const res = await platformApi<{ items: WebhookRow[] }>(
      '/api/v1/platform/integrations/webhooks',
    );
    setWebhooks(res.items);
  }, []);

  useLoadEffect(() =>
    refreshDirectory().catch((err: unknown) =>
      setError(humanizePlatformError(err)),
    ),
  );

  useEffect(() => {
    if (tab !== 'webhooks') return;
    void refreshWebhooks().catch((err: unknown) =>
      setError(humanizePlatformError(err)),
    );
  }, [tab, refreshWebhooks]);

  async function openDetail(id: string) {
    setSelectedId(id);
    setBusy(true);
    setError(null);
    try {
      const res = await platformApi<WebhookDetail>(
        `/api/v1/platform/integrations/webhooks/${id}`,
      );
      setDetail(res);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function replay() {
    if (!selectedId) return;
    const reason = window.prompt('Reason for replay (min 8 chars):');
    if (!reason || reason.trim().length < 8) return;
    setBusy(true);
    setError(null);
    try {
      await platformApi(
        `/api/v1/platform/integrations/webhooks/${selectedId}/replay`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      await openDetail(selectedId);
      await refreshWebhooks();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ConsoleHeader
        area="integrations"
        tab={tab}
        title="Integrations"
        description="Global integration directory and webhook monitor. Secrets are never shown. Health comes from delivery and webhook evidence."
      />

      {error ? <p className="platform-error">{error}</p> : null}

      {tab === 'directory' ? (
        <section className="platform-panel space-y-3 p-4">
          {note ? <p className="text-sm platform-muted">{note}</p> : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              void refreshDirectory().catch((err: unknown) =>
                setError(humanizePlatformError(err)),
              )
            }
          >
            Refresh
          </Button>
          <table className="platform-table">
            <thead>
              <tr>
                <th>Integration</th>
                <th>Category</th>
                <th>Health</th>
                <th>Evidence (24h)</th>
                <th>Config</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="font-medium">{row.name}</div>
                    <div className="platform-muted text-xs">{row.code}</div>
                    {row.description ? (
                      <div className="text-xs platform-muted mt-1">
                        {row.description}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {row.category}
                    <div className="platform-muted text-xs">{row.scope}</div>
                  </td>
                  <td className={healthClass(row.health)}>{row.health}</td>
                  <td className="text-xs">
                    <div>
                      webhooks: {row.evidence.webhook.succeeded} ok /{' '}
                      {row.evidence.webhook.failed} fail /{' '}
                      {row.evidence.webhook.total} total
                    </div>
                    {row.evidence.deliveries24h ? (
                      <div className="platform-muted">
                        deliveries: {row.evidence.deliveries24h.delivered}{' '}
                        delivered / {row.evidence.deliveries24h.failed} failed /{' '}
                        {row.evidence.deliveries24h.total} total
                      </div>
                    ) : null}
                  </td>
                  <td className="platform-muted text-xs max-w-xs">
                    <code>{JSON.stringify(row.configSummary)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === 'webhooks' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="platform-panel overflow-x-auto">
            <div className="platform-panel-head">
              <h2>Recent events</h2>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  void refreshWebhooks().catch((err: unknown) =>
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
                  <th>Integration</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((w) => (
                  <tr
                    key={w.id}
                    className={
                      selectedId === w.id
                        ? 'bg-surface-muted cursor-pointer'
                        : 'cursor-pointer'
                    }
                    onClick={() => void openDetail(w.id)}
                  >
                    <td className="text-xs">
                      {new Date(w.receivedAt).toLocaleString()}
                    </td>
                    <td className="text-xs">{w.integrationCode}</td>
                    <td>
                      <div className="text-xs">{w.eventType}</div>
                      <div className="platform-muted text-xs">
                        {w.direction}
                      </div>
                    </td>
                    <td className="text-xs">
                      {w.processingStatus}
                      {w.retryCount > 0 ? ` · r${w.retryCount}` : ''}
                    </td>
                  </tr>
                ))}
                {webhooks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="platform-muted py-6 text-center">
                      No persisted webhooks yet. Inbound Briq/notify callbacks
                      are recorded on receipt.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>

          <section className="platform-panel space-y-3 p-4">
            {!detail ? (
              <p className="platform-muted text-sm">
                Select an event to inspect attempts and redacted payload.
              </p>
            ) : (
              <>
                <h2 className="text-lg font-semibold">
                  {detail.event.eventType}
                </h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="platform-muted">Status</dt>
                  <dd>{detail.event.processingStatus}</dd>
                  <dt className="platform-muted">HTTP</dt>
                  <dd>{detail.event.httpStatus ?? '—'}</dd>
                  <dt className="platform-muted">Duration</dt>
                  <dd>
                    {detail.event.durationMs != null
                      ? `${detail.event.durationMs} ms`
                      : '—'}
                  </dd>
                  <dt className="platform-muted">Correlation</dt>
                  <dd className="text-xs break-all">
                    {detail.event.correlationId ?? '—'}
                  </dd>
                  {detail.event.errorMessage ? (
                    <>
                      <dt className="platform-muted">Error</dt>
                      <dd className="text-danger text-xs">
                        {detail.event.errorMessage}
                      </dd>
                    </>
                  ) : null}
                </dl>

                <div>
                  <h3 className="text-sm font-medium">Attempts</h3>
                  <ul className="mt-1 space-y-1 text-xs">
                    {detail.attempts.map((a) => (
                      <li key={a.id}>
                        #{a.attemptNumber} {a.outcome}
                        {a.durationMs != null ? ` · ${a.durationMs}ms` : ''}
                        {a.errorMessage ? ` — ${a.errorMessage}` : ''}
                        <span className="platform-muted">
                          {' '}
                          · {new Date(a.createdAt).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-medium">Payload (redacted)</h3>
                  <pre className="mt-1 max-h-48 overflow-auto rounded-md border border-border bg-surface-muted p-2 text-xs">
                    {JSON.stringify(detail.event.payloadRedacted, null, 2)}
                  </pre>
                </div>

                {detail.event.direction === 'incoming' ? (
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => void replay()}
                  >
                    Replay
                  </Button>
                ) : null}
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
