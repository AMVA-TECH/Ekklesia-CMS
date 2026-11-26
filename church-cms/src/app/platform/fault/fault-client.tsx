'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/app/_ekklesia/icons';
import {
  Metric,
  PageHeader,
  Panel,
  Skeleton,
} from '@/app/_ekklesia/ui';
import { humanizePlatformError, platformApi } from '../platform-api';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    platformApi<Health>('/api/v1/platform/health')
      .then(setData)
      .catch((err: unknown) => setError(humanizePlatformError(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Fault response"
        lede={`Operational signals for the last ${data?.windowHours ?? 24} hours — start here when something breaks.`}
      />

      {error ? (
        <div
          role="alert"
          className="rounded-card border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger-ink)]"
        >
          {error}
        </div>
      ) : null}

      <section aria-labelledby="fault-metrics">
        <h2 id="fault-metrics" className="sr-only">
          Fault signals
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading || !data ? (
            <>
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-28 rounded-card" />
            </>
          ) : (
            <>
              <Metric
                label="Failed message jobs"
                value={data.failedMessageJobs}
                icon="alert"
                tone="peach"
              />
              <Metric
                label="Auth failures"
                value={data.authFailures}
                icon="shield"
                tone="lavender"
              />
              <Metric
                label="Open findings"
                value={data.openFindings}
                icon="file"
                tone="sky"
                href="/platform/security"
              />
              <Metric
                label="Critical findings"
                value={data.criticalFindings}
                icon="alert"
                tone="neutral"
                href="/platform/security"
              />
            </>
          )}
        </div>
      </section>

      <Panel title="Runbooks" subtitle="Contain → assess → fix → notify → note">
        <ul className="space-y-3">
          {(data?.runbooks ?? []).map((rb) => (
            <li
              key={rb}
              className="flex items-start gap-3 rounded-xl border border-border bg-[color:var(--sage-soft)] px-4 py-3 text-sm text-foreground"
            >
              <Icon
                name="book"
                size={16}
                className="mt-0.5 shrink-0 text-[color:var(--sage-ink)]"
              />
              <span>{rb}</span>
            </li>
          ))}
          <li className="flex items-start gap-3 rounded-xl border border-border bg-[color:var(--brand-gold-tint)] px-4 py-3 text-sm text-foreground">
            <Icon
              name="shield"
              size={16}
              className="mt-0.5 shrink-0 text-[color:var(--brand-gold-ink)]"
            />
            <span>
              Contain → assess audit trail → fix → notify → post-incident note
              (docs/04-security.md §14)
            </span>
          </li>
        </ul>
      </Panel>
    </div>
  );
}
