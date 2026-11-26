'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLoadEffect } from '@/app/_ekklesia/session';
import {
  Badge,
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
} from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../../console-header';
import { humanizePlatformError, platformApi } from '../../platform-api';

type Delivery = {
  id: string;
  jobId: string;
  channel: string;
  toMasked: string;
  status: string;
  providerRef: string | null;
  error: string | null;
  churchName: string;
  sentAt: string | null;
  createdAt: string;
};

const STATUSES = ['pending', 'sent', 'delivered', 'failed'] as const;

function statusHref(status: string | null) {
  if (!status) return '/platform/messaging/delivery';
  return `/platform/messaging/delivery?status=${status}`;
}

function toneFor(status: string): 'sage' | 'warning' | 'danger' | 'neutral' | 'sky' {
  if (status === 'delivered' || status === 'sent') return 'sage';
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'warning';
  return 'neutral';
}

export function DeliveryClient() {
  const searchParams = useSearchParams();
  const statusFilter = useMemo(() => {
    const raw = searchParams.get('status');
    if (raw && (STATUSES as readonly string[]).includes(raw)) return raw;
    return null;
  }, [searchParams]);

  const [items, setItems] = useState<Delivery[]>([]);
  const [windowDays, setWindowDays] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ limit: '100' });
      if (statusFilter) qs.set('status', statusFilter);
      const res = await platformApi<{ items: Delivery[]; windowDays: number }>(
        `/api/v1/platform/messaging/deliveries?${qs}`,
      );
      setItems(res.items);
      setWindowDays(res.windowDays);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useLoadEffect(load);

  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of items) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <ConsoleHeader
        area="messaging"
        tab="delivery"
        title="Delivery queue"
        description={`Outbound SMS and email copies from the last ${windowDays} days. Submitted means the provider accepted the message; delivered needs a delivery report.`}
      />

      {error ? <p className="platform-error">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
          </>
        ) : (
          STATUSES.map((status) => (
            <Metric
              key={status}
              label={status}
              value={byStatus[status] ?? 0}
              icon={status === 'failed' ? 'alert' : 'chat'}
              tone={
                status === 'failed'
                  ? 'peach'
                  : status === 'delivered'
                    ? 'sage'
                    : 'sky'
              }
              href={statusHref(status)}
            />
          ))
        )}
      </div>

      <nav
        aria-label="Status filter"
        className="flex flex-wrap gap-1 border-b border-border pb-px"
      >
        <Link
          href={statusHref(null)}
          className={
            !statusFilter
              ? 'border-b-2 border-[color:var(--brand-gold)] px-3 py-2 text-sm font-semibold'
              : 'border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
          }
        >
          All statuses
        </Link>
        {STATUSES.map((status) => (
          <Link
            key={status}
            href={statusHref(status)}
            className={
              statusFilter === status
                ? 'border-b-2 border-[color:var(--brand-gold)] px-3 py-2 text-sm font-semibold'
                : 'border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {status}
          </Link>
        ))}
      </nav>

      <Panel title="Delivery log" subtitle="Latest 100 matching the filter" flush>
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="chat"
            tone="sky"
            title="No messages match"
            description="Deliveries appear here once SMS or email notifications are queued."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Queued</TH>
                  <TH>Channel</TH>
                  <TH>Church</TH>
                  <TH>Recipient</TH>
                  <TH>Status</TH>
                  <TH>Provider</TH>
                  <TH>Error</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((row) => (
                  <TR key={row.id}>
                    <TD className="text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </TD>
                    <TD>{row.channel}</TD>
                    <TD>{row.churchName}</TD>
                    <TD className="font-mono text-xs">{row.toMasked}</TD>
                    <TD>
                      <Badge tone={toneFor(row.status)}>{row.status}</Badge>
                    </TD>
                    <TD className="max-w-[10rem] truncate font-mono text-xs">
                      {row.providerRef ?? '—'}
                    </TD>
                    <TD className="max-w-[12rem] truncate text-xs text-muted-foreground">
                      {row.error ?? '—'}
                    </TD>
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
