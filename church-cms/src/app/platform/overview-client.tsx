'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/app/_ekklesia/icons';
import {
  Badge,
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
import { humanizePlatformError, platformApi } from './platform-api';

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
  pendingApplications?: {
    count: number;
    items: Array<{
      id: string;
      officialName: string;
      status: string;
      representativeName: string;
      email: string;
      emailVerifiedAt: string | null;
      createdAt: string;
    }>;
  } | null;
  widgets?: {
    analytics: {
      lifecycle: Record<string, number>;
      applicationsOpen: number;
      activeSupportSessions: number;
    } | null;
    config: {
      globalConfigured: boolean;
      defaultsConfigured: boolean;
      tenantOverrideCount: number;
    } | null;
  };
};

function applicationStatusTone(
  status: string,
): 'sage' | 'sky' | 'warning' | 'neutral' {
  if (status === 'email_verified' || status === 'under_review') return 'sky';
  if (status === 'submitted') return 'warning';
  return 'neutral';
}

function severityTone(
  severity: string,
): 'danger' | 'warning' | 'info' | 'neutral' {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'medium') return 'warning';
  if (severity === 'low' || severity === 'info') return 'info';
  return 'neutral';
}

export function OverviewClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    platformApi<Overview>('/api/v1/platform/overview')
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(humanizePlatformError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lifecycleEntries = Object.entries(data?.widgets?.analytics?.lifecycle ?? {});

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <section
        aria-labelledby="platform-welcome"
        className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
      >
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/imagery/hero-church.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/92 to-surface/35" />
        </div>
        <div className="relative flex min-h-[11rem] flex-col justify-center gap-3 px-5 py-7 sm:px-8 sm:py-9 lg:max-w-[62%]">
          <h1
            id="platform-welcome"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Platform control plane
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Health, security findings, and adoption signals across every church —
            aggregate oversight, separate from church governance.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Link
              href="/platform/churches/applications"
              className={buttonClassName({ variant: 'primary', size: 'sm' })}
            >
              <Icon name="check" size={14} />
              Application verification
              {data?.pendingApplications && data.pendingApplications.count > 0
                ? ` (${data.pendingApplications.count})`
                : ''}
            </Link>
            <Link
              href="/platform/churches"
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            >
              <Icon name="church" size={14} />
              Churches
            </Link>
            <Link
              href="/platform/security"
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            >
              <Icon name="shield" size={14} />
              Security
            </Link>
          </div>
        </div>
      </section>

      <PageHeader
        title="Overview"
        lede="Live aggregates from the platform plane. Extra widgets appear when your permissions allow."
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Refresh
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

      <section aria-labelledby="platform-metrics">
        <h2 id="platform-metrics" className="sr-only">
          Key numbers
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {loading ? (
            <>
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-28 rounded-card" />
              <Skeleton className="h-28 rounded-card" />
            </>
          ) : (
            <>
              <Metric
                label="Health score"
                value={data?.healthScore ?? '—'}
                icon="heart"
                tone="sage"
                hint="Composite from findings & faults"
              />
              <Metric
                label="Open findings"
                value={data?.findings.open ?? '—'}
                icon="shield"
                tone="peach"
                href="/platform/security"
              />
              <Metric
                label="Critical"
                value={data?.findings.critical ?? '—'}
                icon="alert"
                tone="neutral"
                href="/platform/security"
              />
              <Metric
                label="Churches"
                value={data?.growth.churchesTotal ?? '—'}
                icon="church"
                tone="sky"
                href="/platform/churches"
              />
              <Metric
                label="People"
                value={data?.growth.peopleTotal ?? '—'}
                icon="users"
                tone="lavender"
              />
              <Metric
                label="Active members"
                value={data?.growth.membershipsActive ?? '—'}
                icon="users"
                tone="gold"
              />
              {data?.pendingApplications ? (
                <Metric
                  label="Pending verification"
                  value={data.pendingApplications.count}
                  icon="check"
                  tone="peach"
                  href="/platform/churches/applications"
                  hint="Church applications awaiting KYC"
                />
              ) : null}
            </>
          )}
        </div>
      </section>

      {data?.pendingApplications ? (
        <Panel
          title="Pending application verification"
          subtitle={
            data.pendingApplications.count === 0
              ? 'No applications waiting for review'
              : `${data.pendingApplications.count} awaiting guided KYC`
          }
          linkHref="/platform/churches/applications"
          linkLabel="Open queue"
          flush
        >
          {data.pendingApplications.items.length === 0 ? (
            <EmptyState
              icon="check"
              tone="sage"
              title="Queue clear"
              description="New church registrations will appear here for verification."
            />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Church</TH>
                    <TH>Status</TH>
                    <TH>Representative</TH>
                    <TH>Submitted</TH>
                    <TH>
                      <span className="sr-only">Open</span>
                    </TH>
                  </TR>
                </THead>
                <TBody>
                  {data.pendingApplications.items.map((app) => (
                    <TR key={app.id}>
                      <TD>
                        <Link
                          href={`/platform/churches/applications/${app.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {app.officialName}
                        </Link>
                      </TD>
                      <TD>
                        <Badge tone={applicationStatusTone(app.status)}>
                          {app.status.replace(/_/g, ' ')}
                        </Badge>
                      </TD>
                      <TD className="text-muted-foreground">
                        <span className="block truncate">{app.representativeName}</span>
                        <span className="block truncate text-xs">{app.email}</span>
                      </TD>
                      <TD className="text-muted-foreground">
                        {new Date(app.createdAt).toLocaleString()}
                      </TD>
                      <TD>
                        <Link
                          href={`/platform/churches/applications/${app.id}`}
                          className={buttonClassName({
                            variant: 'secondary',
                            size: 'sm',
                          })}
                        >
                          Verify
                        </Link>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Panel>
      ) : null}

      <div
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--brand-gold-soft)] bg-[color:var(--brand-gold-tint)] px-5 py-4"
      >
        <Icon name="chart" size={18} className="text-[color:var(--brand-gold-ink)]" />
        <p className="min-w-0 flex-1 text-sm text-[color:var(--brand-gold-ink)]">
          Auth fails (7d): {data?.fault.authFailures7d ?? '—'} · Failed jobs:{' '}
          {data?.fault.failedMessageJobs7d ?? '—'} · Check-ins:{' '}
          {data?.growth.attendanceCheckins7d ?? '—'} · Messages:{' '}
          {data?.growth.messagesSent7d ?? '—'}
        </p>
        <Link
          href="/platform/fault"
          className={buttonClassName({ variant: 'secondary', size: 'sm' })}
        >
          Fault response
        </Link>
      </div>

      {data?.widgets?.analytics ? (
        <section aria-labelledby="platform-analytics-widgets">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2
              id="platform-analytics-widgets"
              className="text-base font-semibold text-foreground"
            >
              Analytics snapshot
            </h2>
            <Link
              href="/platform/analytics"
              className="text-sm font-medium text-foreground hover:text-[color:var(--brand-gold-ink)]"
            >
              Full report
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Open applications"
              value={data.widgets.analytics.applicationsOpen}
              icon="file"
              tone="sky"
              href="/platform/churches/applications"
            />
            <Metric
              label="Active support sessions"
              value={data.widgets.analytics.activeSupportSessions}
              icon="chat"
              tone="peach"
              href="/platform/support"
            />
            {lifecycleEntries.slice(0, 2).map(([status, n]) => (
              <Metric
                key={status}
                label={`Lifecycle · ${status}`}
                value={n}
                icon="church"
                tone="lavender"
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        {data?.widgets?.config ? (
          <div className="min-w-0 lg:col-span-2">
            <Panel
              title="Configuration layers"
              subtitle="Global settings and tenant defaults"
              linkHref="/platform/configuration"
              linkLabel="Configure"
            >
              <ul className="divide-y divide-border px-5">
                <li className="flex items-center justify-between gap-3 py-3">
                  <span className="text-sm text-foreground">Global settings</span>
                  <Badge tone={data.widgets.config.globalConfigured ? 'sage' : 'neutral'}>
                    {data.widgets.config.globalConfigured
                      ? 'Configured'
                      : 'Code defaults'}
                  </Badge>
                </li>
                <li className="flex items-center justify-between gap-3 py-3">
                  <span className="text-sm text-foreground">Tenant defaults</span>
                  <Badge
                    tone={data.widgets.config.defaultsConfigured ? 'sky' : 'neutral'}
                  >
                    {data.widgets.config.defaultsConfigured
                      ? 'Configured'
                      : 'Code defaults'}
                  </Badge>
                </li>
                <li className="flex items-center justify-between gap-3 py-3">
                  <span className="text-sm text-foreground">Tenant overrides</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {data.widgets.config.tenantOverrideCount}
                  </span>
                </li>
              </ul>
            </Panel>
          </div>
        ) : null}

        <div
          className={
            data?.widgets?.config
              ? 'min-w-0 lg:col-span-3'
              : 'min-w-0 lg:col-span-5'
          }
        >
          <Panel
            title="Recent open findings"
            subtitle="Security detectors and acknowledgements"
            linkHref="/platform/security"
            linkLabel="Security Centre"
            flush
          >
            {loading ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : !data || data.findings.recent.length === 0 ? (
              <EmptyState
                icon="shield"
                tone="sage"
                title="No open findings"
                description="Run detectors from Security when you want a fresh scan."
              />
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <TR>
                      <TH>Severity</TH>
                      <TH>Title</TH>
                      <TH>Category</TH>
                      <TH>Last seen</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.findings.recent.map((f) => (
                      <TR key={f.id}>
                        <TD>
                          <Badge tone={severityTone(f.severity)}>
                            {f.severity}
                          </Badge>
                        </TD>
                        <TD>{f.title}</TD>
                        <TD className="text-muted-foreground">{f.category}</TD>
                        <TD className="text-muted-foreground">
                          {new Date(f.lastSeenAt).toLocaleString()}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
