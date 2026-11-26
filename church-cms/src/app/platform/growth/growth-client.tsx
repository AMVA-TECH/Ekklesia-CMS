'use client';

import { useCallback, useState } from 'react';
import { useLoadEffect } from '@/app/_ekklesia/session';
import {
  Button,
  EmptyState,
  Metric,
  PageHeader,
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
import { humanizePlatformError, platformApi } from '../platform-api';

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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi<Growth>('/api/v1/platform/growth?days=30');
      setData(res);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useLoadEffect(load);

  async function snapshot() {
    setBusy(true);
    setError(null);
    try {
      await platformApi('/api/v1/platform/metrics/snapshot', { method: 'POST' });
      await load();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  const series = data?.series.churches_total ?? [];

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Platform growth"
        lede="Live totals and daily metric snapshots for platform adoption."
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={busy}
            onClick={() => void snapshot()}
          >
            Write today&apos;s snapshot
          </Button>
        }
      />

      {error ? (
        <div
          role="alert"
          className="rounded-card border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-[color:var(--danger-ink)]"
        >
          {error}
        </div>
      ) : null}

      <section aria-labelledby="growth-metrics">
        <h2 id="growth-metrics" className="sr-only">
          Live totals
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {loading || !data ? (
            <>
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-28 rounded-card" />
            </>
          ) : (
            <>
              <Metric
                label="Churches"
                value={data.live.churchesTotal}
                icon="church"
                tone="sky"
              />
              <Metric
                label="People"
                value={data.live.peopleTotal}
                icon="users"
                tone="lavender"
              />
              <Metric
                label="Active memberships"
                value={data.live.membershipsActive}
                icon="users"
                tone="sage"
              />
              <Metric
                label="Check-ins (7d)"
                value={data.live.attendanceCheckins7d}
                icon="chart"
                tone="peach"
              />
              <Metric
                label="Messages (7d)"
                value={data.live.messagesSent7d}
                icon="chat"
                tone="gold"
              />
            </>
          )}
        </div>
      </section>

      <Panel
        title="Snapshot series"
        subtitle="Daily churches_total"
        flush
      >
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : series.length === 0 ? (
          <EmptyState
            icon="chart"
            tone="sky"
            title="No snapshots yet"
            description="Write today’s snapshot to start the series."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Value</TH>
                </TR>
              </THead>
              <TBody>
                {series.map((row) => (
                  <TR key={row.date}>
                    <TD>{row.date}</TD>
                    <TD className="tabular-nums">{row.value}</TD>
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
