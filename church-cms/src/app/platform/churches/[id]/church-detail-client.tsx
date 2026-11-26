'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useState } from 'react';
import { Icon } from '@/app/_ekklesia/icons';
import { useLoadEffect } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
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
import { ConsoleHeader } from '../../console-header';
import { CHURCH_WORKSPACE_MODULES } from '../../platform-console';
import { humanizePlatformError, platformApi } from '../../platform-api';

type Detail = {
  church: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    defaultLocale: string;
    lifecycleStatus: string;
    createdAt: string;
  };
  counts: { memberships: number; activeMemberships: number };
  accounts: Array<{
    userAccountId: string;
    displayName: string | null;
    email: string | null;
    phoneE164: string | null;
    accountStatus: string;
    orgLinkStatus: string;
  }>;
  openFindings: Array<{
    id: string;
    severity: string;
    title: string;
    status: string;
    lastSeenAt: string;
  }>;
  recentAudit: Array<{
    id: string;
    action: string;
    outcome: string;
    actorEmail: string;
    reason: string | null;
    createdAt: string;
  }>;
};

const LIFECYCLE = [
  'active',
  'suspended',
  'closed',
  'pending_activation',
] as const;

export function ChurchDetailClient({ churchId }: { churchId: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lifecycleStatus, setLifecycleStatus] =
    useState<(typeof LIFECYCLE)[number]>('active');
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [enterReason, setEnterReason] = useState('');
  const [accessLevel, setAccessLevel] = useState<'read' | 'interactive'>(
    'read',
  );
  const [enterNext, setEnterNext] = useState('/admin');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi<Detail>(
        `/api/v1/platform/churches/${churchId}`,
      );
      setData(res);
      setLifecycleStatus(
        res.church.lifecycleStatus as (typeof LIFECYCLE)[number],
      );
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  useLoadEffect(load);

  async function enterChurch(nextPath: string, reasonText: string) {
    setBusy(true);
    setError(null);
    try {
      await platformApi(`/api/v1/platform/tenants/${churchId}/enter`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reason: reasonText.trim(),
          accessLevel,
          expiresInMinutes: 60,
        }),
      });
      window.location.href = nextPath;
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
      setBusy(false);
    }
  }

  async function onLifecycle(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await platformApi(`/api/v1/platform/churches/${churchId}/lifecycle`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          lifecycleStatus,
          reason: reason.trim(),
          pin:
            lifecycleStatus === 'suspended' || lifecycleStatus === 'closed'
              ? pin
              : undefined,
        }),
      });
      setReason('');
      setPin('');
      await load();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onModuleEnter(href: string) {
    const why =
      enterReason.trim().length >= 8
        ? enterReason.trim()
        : `Open ${href} for support investigation`;
    if (why.length < 8) {
      setError('Enter a reason (at least 8 characters) before opening a module.');
      return;
    }
    await enterChurch(href, why);
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-2/3" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon="church"
        tone="peach"
        title="Church not found"
        description={error ?? 'This tenant could not be loaded.'}
        action={
          <Link
            href="/platform/churches"
            className={buttonClassName({ variant: 'secondary', size: 'sm' })}
          >
            Back to directory
          </Link>
        }
      />
    );
  }

  const { church } = data;
  const isActive = church.lifecycleStatus === 'active';

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <ConsoleHeader
        area="churches"
        tab="directory"
        title={church.name}
        description={`${church.slug} · ${church.timezone} · ${church.defaultLocale}. Enter the church to work inside its records; the switch is audited.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone={
                church.lifecycleStatus === 'active'
                  ? 'sage'
                  : church.lifecycleStatus === 'suspended'
                    ? 'warning'
                    : 'neutral'
              }
            >
              {church.lifecycleStatus}
            </Badge>
            {isActive ? (
              <Button
                type="button"
                size="sm"
                disabled={busy || enterReason.trim().length < 8}
                onClick={() => void enterChurch(enterNext, enterReason)}
              >
                Enter church
              </Button>
            ) : null}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Memberships"
          value={data.counts.memberships}
          icon="users"
          tone="sky"
        />
        <Metric
          label="Active members"
          value={data.counts.activeMemberships}
          icon="users"
          tone="sage"
        />
        <Metric
          label="Accounts"
          value={data.accounts.length}
          icon="users"
          tone="lavender"
          href={`/platform/access?tab=tenant`}
        />
        <Metric
          label="Open findings"
          value={data.openFindings.length}
          icon="shield"
          tone="peach"
          href="/platform/security"
        />
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          {isActive ? (
            <Panel
              title="Work inside this church"
              subtitle="Opening a module enters the tenant; the switch is audited. Default access is read."
            >
              <label className="mb-4 block text-sm">
                <span className="text-muted-foreground">
                  Reason for this session (required)
                </span>
                <textarea
                  className="platform-textarea mt-1"
                  value={enterReason}
                  onChange={(e) => setEnterReason(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Investigating failed message job…"
                />
              </label>
              <label className="mb-4 block text-sm">
                <span className="text-muted-foreground">Access level</span>
                <select
                  className="platform-select mt-1"
                  value={accessLevel}
                  onChange={(e) =>
                    setAccessLevel(e.target.value as 'read' | 'interactive')
                  }
                >
                  <option value="read">read</option>
                  <option value="interactive">interactive</option>
                </select>
              </label>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CHURCH_WORKSPACE_MODULES.map((module) => (
                  <li key={module.href}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEnterNext(module.href);
                        void onModuleEnter(module.href);
                      }}
                      className={buttonClassName({
                        variant: 'secondary',
                        size: 'sm',
                        className: 'w-full justify-start gap-2',
                      })}
                    >
                      <Icon name={module.icon} size={16} />
                      {module.label}
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title="Open findings" flush>
            {data.openFindings.length === 0 ? (
              <EmptyState
                icon="shield"
                tone="sage"
                title="No open findings"
                description="Security detectors have nothing open for this church."
              />
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <TR>
                      <TH>Severity</TH>
                      <TH>Title</TH>
                      <TH>Last seen</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.openFindings.map((f) => (
                      <TR key={f.id}>
                        <TD>
                          <Badge
                            tone={
                              f.severity === 'critical' || f.severity === 'high'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {f.severity}
                          </Badge>
                        </TD>
                        <TD>{f.title}</TD>
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

          <Panel
            title="Recent activity"
            subtitle="Latest platform audit events for this church"
            flush
          >
            {data.recentAudit.length === 0 ? (
              <EmptyState
                icon="file"
                tone="neutral"
                title="No audit yet"
                description="Platform actions on this tenant will appear here."
              />
            ) : (
              <TableWrap>
                <Table>
                  <THead>
                    <TR>
                      <TH>When</TH>
                      <TH>Action</TH>
                      <TH>Actor</TH>
                      <TH>Reason</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.recentAudit.map((row) => (
                      <TR key={row.id}>
                        <TD className="text-muted-foreground">
                          {new Date(row.createdAt).toLocaleString()}
                        </TD>
                        <TD>{row.action}</TD>
                        <TD>{row.actorEmail}</TD>
                        <TD>{row.reason ?? '—'}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            )}
          </Panel>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Panel title="Details">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="font-mono text-xs">{church.slug}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{new Date(church.createdAt).toLocaleString()}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Locale</dt>
                <dd>{church.defaultLocale}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Lifecycle" subtitle="Suspend, restore or close with reason">
            <form className="space-y-3" onSubmit={(e) => void onLifecycle(e)}>
              <label className="block text-sm">
                <span className="text-muted-foreground">Status</span>
                <select
                  className="platform-select mt-1"
                  value={lifecycleStatus}
                  onChange={(e) =>
                    setLifecycleStatus(
                      e.target.value as (typeof LIFECYCLE)[number],
                    )
                  }
                >
                  {LIFECYCLE.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Reason</span>
                <textarea
                  className="platform-textarea mt-1"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  minLength={8}
                />
              </label>
              {(lifecycleStatus === 'suspended' ||
                lifecycleStatus === 'closed') && (
                <label className="block text-sm">
                  <span className="text-muted-foreground">
                    Confirm with your PIN
                  </span>
                  <input
                    type="password"
                    inputMode="numeric"
                    className="platform-input mt-1"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    minLength={4}
                    maxLength={8}
                    autoComplete="current-password"
                  />
                </label>
              )}
              <Button type="submit" disabled={busy} size="sm">
                Update lifecycle
              </Button>
            </form>
          </Panel>

          <Panel title="Accounts" subtitle="Technical identities linked to this church" flush>
            {data.accounts.length === 0 ? (
              <EmptyState
                icon="users"
                tone="neutral"
                title="No accounts loaded"
                description="Requires platform:accounts_read, or none are linked yet."
              />
            ) : (
              <ul className="divide-y divide-border">
                {data.accounts.map((account) => (
                  <li key={account.userAccountId} className="px-4 py-3 sm:px-5">
                    <Link
                      href={`/platform/access?tab=tenant`}
                      className="flex items-start justify-between gap-2 hover:underline"
                    >
                      <span>
                        <span className="block font-medium">
                          {account.displayName ?? account.email ?? 'Account'}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {account.email ?? account.phoneE164 ?? '—'} ·{' '}
                          {account.accountStatus} / {account.orgLinkStatus}
                        </span>
                      </span>
                      <Icon
                        name="chevron-right"
                        size={16}
                        className="mt-1 opacity-50"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
