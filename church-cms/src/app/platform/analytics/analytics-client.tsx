'use client';

import Link from 'next/link';
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
  buttonClassName,
} from '@/app/_ekklesia/ui';
import { humanizePlatformError, platformApi } from '../platform-api';

type Analytics = {
  days: number;
  privacy: { note: string };
  adoption: {
    churchesTotal: number;
    peopleTotal: number;
    membershipsActive: number;
    attendanceCheckins7d: number;
    messagesSent7d: number;
  };
  lifecycle: Record<string, number>;
  registrationFunnel: {
    applicationsByStatus: Record<string, number>;
    provisioningByStatus: Record<string, number>;
    applicationsInWindow: number;
  };
  security: {
    openFindingsBySeverity: Record<string, number>;
    authFailures7d: number;
    exportsInWindow: number;
    roleAssignAuditsInWindow: number;
  };
  operations: {
    failedMessageJobs7d: number;
    supportCasesByStatus: Record<string, number>;
    activeSupportSessions: number;
  };
  series: Record<string, Array<{ date: string; value: number }>>;
};

function StatusTable({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data);
  return (
    <Panel title={title} flush>
      {entries.length === 0 ? (
        <EmptyState
          icon="chart"
          tone="neutral"
          title="No rows yet"
          description="Counts appear as activity lands in this window."
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Status</TH>
                <TH>Count</TH>
              </TR>
            </THead>
            <TBody>
              {entries.map(([status, n]) => (
                <TR key={status}>
                  <TD>{status}</TD>
                  <TD className="tabular-nums">{n}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}
    </Panel>
  );
}

export function AnalyticsClient() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi<Analytics>(
        `/api/v1/platform/analytics?days=${days}`,
      );
      setData(res);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useLoadEffect(load);

  const series = data?.series.churches_total ?? [];

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Analytics & reports"
        lede="Platform-wide operational aggregates with tenant privacy boundaries. No giving, pastoral notes, or Restricted fields."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Window
              <select
                className="rounded-control border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void load()}
            >
              Refresh
            </Button>
            <Link
              href="/platform/growth"
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            >
              Growth snapshots
            </Link>
          </div>
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

      {data?.privacy.note ? (
        <p className="rounded-2xl border border-[color:var(--sky-soft)] bg-[color:var(--sky-soft)] px-4 py-3 text-sm text-[color:var(--sky-ink)]">
          {data.privacy.note}
        </p>
      ) : null}

      <section aria-labelledby="analytics-metrics">
        <h2 id="analytics-metrics" className="sr-only">
          Adoption metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading || !data ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-card" />
            ))
          ) : (
            <>
              <Metric
                label="Churches"
                value={data.adoption.churchesTotal}
                icon="church"
                tone="sky"
              />
              <Metric
                label="People"
                value={data.adoption.peopleTotal}
                icon="users"
                tone="lavender"
              />
              <Metric
                label="Active members"
                value={data.adoption.membershipsActive}
                icon="users"
                tone="sage"
              />
              <Metric
                label="Check-ins (7d)"
                value={data.adoption.attendanceCheckins7d}
                icon="chart"
                tone="peach"
              />
              <Metric
                label="Messages (7d)"
                value={data.adoption.messagesSent7d}
                icon="chat"
                tone="gold"
              />
              <Metric
                label="Apps in window"
                value={data.registrationFunnel.applicationsInWindow}
                icon="file"
                tone="sky"
              />
              <Metric
                label="Auth fails (7d)"
                value={data.security.authFailures7d}
                icon="shield"
                tone="peach"
              />
              <Metric
                label="Active support sessions"
                value={data.operations.activeSupportSessions}
                icon="chat"
                tone="lavender"
              />
            </>
          )}
        </div>
      </section>

      {data ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <StatusTable title="Tenant lifecycle" data={data.lifecycle} />
            <StatusTable
              title="Registration applications"
              data={data.registrationFunnel.applicationsByStatus}
            />
            <StatusTable
              title="Provisioning"
              data={data.registrationFunnel.provisioningByStatus}
            />
            <StatusTable
              title="Open findings by severity"
              data={data.security.openFindingsBySeverity}
            />
            <StatusTable
              title="Support cases"
              data={data.operations.supportCasesByStatus}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title={`Window security signals (${data.days}d)`} flush>
              <ul className="divide-y divide-border px-5">
                <li className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>Exports audited</span>
                  <span className="font-semibold tabular-nums">
                    {data.security.exportsInWindow}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>Role-assign audits</span>
                  <span className="font-semibold tabular-nums">
                    {data.security.roleAssignAuditsInWindow}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>Failed message jobs (7d)</span>
                  <span className="font-semibold tabular-nums">
                    {data.operations.failedMessageJobs7d}
                  </span>
                </li>
              </ul>
            </Panel>

            <Panel title="Snapshot series (churches_total)" flush>
              {series.length === 0 ? (
                <EmptyState
                  icon="chart"
                  tone="sky"
                  title="No snapshots yet"
                  description="Write one from Growth to populate this series."
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
        </>
      ) : null}
    </div>
  );
}
