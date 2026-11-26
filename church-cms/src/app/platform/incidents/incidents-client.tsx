'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useState } from 'react';
import { useLoadEffect } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  Skeleton,
  buttonClassName,
} from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../console-header';
import { humanizePlatformError, platformApi } from '../platform-api';

type Incident = {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  severity: string;
  churchName: string | null;
  description?: string | null;
  createdAt: string;
};

function severityTone(
  severity: string,
): 'danger' | 'warning' | 'neutral' | 'sage' {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'medium') return 'warning';
  return 'neutral';
}

export function IncidentsClient() {
  const [items, setItems] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resolveReasons, setResolveReasons] = useState<Record<string, string>>(
    {},
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi<{ items: Incident[] }>(
        '/api/v1/platform/support/cases?limit=100',
      );
      // Incident queue: open / in progress / waiting — same queue RentFlow shows.
      setItems(
        res.items.filter((c) =>
          ['open', 'in_progress', 'waiting'].includes(c.status),
        ),
      );
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useLoadEffect(load);

  async function acknowledge(id: string) {
    setBusy(true);
    setError(null);
    try {
      await platformApi(`/api/v1/platform/support/cases/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });
      await load();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function resolve(e: FormEvent, id: string) {
    e.preventDefault();
    const reason = (resolveReasons[id] ?? '').trim();
    if (reason.length < 8) {
      setError('Resolution reason needs at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await platformApi(`/api/v1/platform/support/cases/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved',
          description: reason,
        }),
      });
      setResolveReasons((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <ConsoleHeader
        area="incidents"
        tab="queue"
        title="Incidents"
        description="Acknowledge and resolve platform reliability incidents. Every transition records its operator."
        actions={
          <Link
            href="/platform/incidents/new"
            className={buttonClassName({ variant: 'primary', size: 'sm' })}
          >
            Report incident
          </Link>
        }
      />

      {error ? <p className="platform-error">{error}</p> : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="check"
          tone="sage"
          title="No open incidents"
          description="Platform reliability incidents appear here for acknowledgement and resolution."
          action={
            <Link
              href="/platform/incidents/new"
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            >
              Report incident
            </Link>
          }
        />
      ) : (
        <Panel
          title="Incident queue"
          subtitle="Acknowledge, investigate and resolve."
          flush
        >
          <ol className="divide-y divide-border">
            {items.map((incident) => (
              <li key={incident.id} className="px-4 py-5 sm:px-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {incident.title}
                      </p>
                      <Badge tone="neutral">{incident.status}</Badge>
                      <Badge tone={severityTone(incident.severity)}>
                        {incident.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {incident.caseNumber}
                      {incident.churchName
                        ? ` · ${incident.churchName}`
                        : ' · Platform-wide'}
                      {' · '}
                      {new Date(incident.createdAt).toLocaleString()}
                    </p>
                    {incident.description ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {incident.description}
                      </p>
                    ) : null}
                  </div>
                  {incident.status === 'open' ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void acknowledge(incident.id)}
                    >
                      Acknowledge
                    </Button>
                  ) : null}
                </div>
                {incident.status === 'in_progress' ||
                incident.status === 'waiting' ? (
                  <form
                    className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end"
                    onSubmit={(e) => void resolve(e, incident.id)}
                  >
                    <label className="block text-sm">
                      <span className="text-muted-foreground">
                        Resolution reason
                      </span>
                      <input
                        className="platform-input mt-1"
                        required
                        minLength={8}
                        maxLength={500}
                        placeholder="Describe what was resolved and why the incident can close"
                        value={resolveReasons[incident.id] ?? ''}
                        onChange={(e) =>
                          setResolveReasons((prev) => ({
                            ...prev,
                            [incident.id]: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <Button type="submit" size="sm" disabled={busy}>
                      Resolve incident
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ol>
        </Panel>
      )}

      <p className="text-xs text-muted-foreground">
        Incidents share the support-case store so case numbers stay consistent
        with the support centre. Use{' '}
        <Link href="/platform/support" className="underline">
          Support
        </Link>{' '}
        for church-ticket workflows.
      </p>
    </div>
  );
}
