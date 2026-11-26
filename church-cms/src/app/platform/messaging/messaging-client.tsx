'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useLoadEffect } from '@/app/_ekklesia/session';
import {
  EmptyState,
  Metric,
  Panel,
  Skeleton,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  buttonClassName,
} from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../console-header';
import { humanizePlatformError, platformApi } from '../platform-api';

type Overview = {
  providers: Array<{
    code: string;
    name: string;
    category: string;
    description?: string;
  }>;
  notify: {
    provider: string;
    configured: boolean;
    testRecipients: string | null;
  };
  last24h: {
    jobsByStatus: Record<string, number>;
    deliveriesByStatus: Record<string, number>;
  };
  recentJobs: Array<{
    id: string;
    channel: string;
    status: string;
    title: string | null;
    createdAt: string;
  }>;
  failedJobs: Array<{
    id: string;
    channel: string;
    status: string;
    title: string | null;
    createdAt: string;
  }>;
};

export function MessagingClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi<Overview>('/api/v1/platform/messaging');
      setData(res);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useLoadEffect(load);

  const jobs = data?.last24h.jobsByStatus ?? {};
  const deliveries = data?.last24h.deliveriesByStatus ?? {};

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <ConsoleHeader
        area="messaging"
        tab="overview"
        title="Messaging"
        description="Channel status, delivery evidence and testing. Secrets stay in env — never shown here."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/platform/messaging/delivery"
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            >
              Delivery queue
            </Link>
            <Link
              href="/platform/messaging/testing"
              className={buttonClassName({ variant: 'primary', size: 'sm' })}
            >
              Send test
            </Link>
          </div>
        }
      />

      {error ? <p className="platform-error">{error}</p> : null}

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
              label="Jobs failed (24h)"
              value={jobs.failed ?? 0}
              icon="alert"
              tone="peach"
              href="/platform/messaging/delivery?status=failed"
            />
            <Metric
              label="Jobs completed (24h)"
              value={jobs.completed ?? jobs.sent ?? 0}
              icon="check"
              tone="sage"
            />
            <Metric
              label="Deliveries failed (24h)"
              value={deliveries.failed ?? 0}
              icon="alert"
              tone="lavender"
              href="/platform/messaging/delivery?status=failed"
            />
            <Metric
              label="Notify provider"
              value={data.notify.provider}
              icon="globe"
              tone={data.notify.configured ? 'sky' : 'neutral'}
              hint={
                data.notify.configured ? 'Configured' : 'Stub / not configured'
              }
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Providers" subtitle="Catalogue entries (no secrets)">
          {!data || data.providers.length === 0 ? (
            <EmptyState
              icon="globe"
              tone="neutral"
              title="No messaging providers"
              description="Catalogue entries for SMS and email appear here."
            />
          ) : (
            <ul className="space-y-2 text-sm">
              {data.providers.map((p) => (
                <li
                  key={p.code}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
                >
                  <span>
                    <span className="font-medium">{p.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {p.code}
                      {p.description ? ` · ${p.description}` : ''}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.category}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Failed jobs (24h)"
          subtitle="Investigate from the delivery queue"
          flush
        >
          {!data || data.failedJobs.length === 0 ? (
            <EmptyState
              icon="check"
              tone="sage"
              title="No failures in the window"
              description="Failed messaging jobs will list here."
            />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>When</TH>
                    <TH>Channel</TH>
                    <TH>Title</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.failedJobs.slice(0, 8).map((j) => (
                    <TR key={j.id}>
                      <TD className="text-muted-foreground">
                        {new Date(j.createdAt).toLocaleString()}
                      </TD>
                      <TD>{j.channel}</TD>
                      <TD>{j.title ?? '—'}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Panel>
      </div>

      <Panel title="Recent jobs (24h)" flush>
        {!data || data.recentJobs.length === 0 ? (
          <EmptyState
            icon="chat"
            tone="sky"
            title="No jobs in the window"
            description="Church messaging jobs will appear here as evidence."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Channel</TH>
                  <TH>Status</TH>
                  <TH>Title</TH>
                </TR>
              </THead>
              <TBody>
                {data.recentJobs.map((j) => (
                  <TR key={j.id}>
                    <TD className="text-muted-foreground">
                      {new Date(j.createdAt).toLocaleString()}
                    </TD>
                    <TD>{j.channel}</TD>
                    <TD>{j.status}</TD>
                    <TD>{j.title ?? '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
