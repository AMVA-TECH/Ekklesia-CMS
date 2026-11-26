'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useState } from 'react';
import { useLoadEffect } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Panel,
  Skeleton,
  buttonClassName,
} from '@/app/_ekklesia/ui';
import {
  PLATFORM_PERMISSIONS,
  PLATFORM_PERMISSION_META,
  PLATFORM_ROLE_TEMPLATES,
  type PlatformPermissionCode,
} from '@/modules/platform-ops/platform-permissions';
import { humanizePlatformError, platformApi } from '../../../platform-api';

type OperatorDetail = {
  id: string;
  userAccountId: string;
  email: string | null;
  phoneE164: string | null;
  status: string;
  accountStatus: string | null;
  permissions: string[];
  mfaEnabled?: boolean;
  activeSessionCount?: number;
  createdAt: string;
  updatedAt: string;
};

export function OperatorDetailClient({
  operatorId,
}: {
  operatorId: string;
}) {
  const [data, setData] = useState<OperatorDetail | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi<OperatorDetail>(
        `/api/v1/platform/operators/${operatorId}`,
      );
      setData(res);
      setSelected(new Set(res.permissions ?? []));
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useLoadEffect(load);

  function applyTemplate(code: string) {
    const template = PLATFORM_ROLE_TEMPLATES.find((t) => t.code === code);
    if (!template) return;
    setSelected(new Set(template.permissions));
  }

  function togglePerm(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (selected.size < 1) {
      setError('Select at least one permission.');
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await platformApi(`/api/v1/platform/operators/${operatorId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          permissions: [...selected] as PlatformPermissionCode[],
          reason: reason.trim(),
        }),
      });
      setReason('');
      setSaved(true);
      await load();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function patchStatus(status: 'active' | 'suspended') {
    const why = window.prompt('Reason (min 8 characters):');
    if (!why || why.trim().length < 8) return;
    setBusy(true);
    try {
      await platformApi(`/api/v1/platform/operators/${operatorId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, reason: why.trim() }),
      });
      await load();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-1/2" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon="users"
        tone="peach"
        title="Operator not found"
        description={error ?? 'Could not load this platform operator.'}
        action={
          <Link
            href="/platform/access"
            className={buttonClassName({ variant: 'secondary', size: 'sm' })}
          >
            Back to access
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link
            href="/platform/access"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Accounts & access
          </Link>
        }
        title={data.email ?? 'Operator'}
        lede="Grant editor uses named role templates. Last privileged operator cannot be demoted."
        actions={
          <Badge tone={data.status === 'active' ? 'sage' : 'warning'}>
            {data.status}
          </Badge>
        }
      />

      {error ? <p className="platform-error">{error}</p> : null}
      {saved ? (
        <p className="rounded-card bg-[color:var(--sage-soft)] px-4 py-3 text-sm text-[color:var(--sage-ink)]">
          Permissions saved and audited.
        </p>
      ) : null}

      <Panel title="Account">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{data.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{data.phoneE164 ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">MFA</dt>
            <dd>{data.mfaEnabled ? 'on' : 'off'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Active sessions</dt>
            <dd>{data.activeSessionCount ?? 0}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.status === 'active' ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void patchStatus('suspended')}
            >
              Suspend
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void patchStatus('active')}
            >
              Restore
            </Button>
          )}
        </div>
      </Panel>

      <Panel
        title="Platform permissions"
        subtitle="Apply a role template, then fine-tune"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {PLATFORM_ROLE_TEMPLATES.filter((t) => !t.protected || t.code === 'platform_owner').map(
            (t) => (
              <Button
                key={t.code}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => applyTemplate(t.code)}
              >
                {t.name}
              </Button>
            ),
          )}
        </div>
        <form className="space-y-4" onSubmit={(e) => void onSave(e)}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {PLATFORM_PERMISSIONS.map((code) => (
              <li key={code}>
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-muted">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(code)}
                    onChange={() => togglePerm(code)}
                  />
                  <span>
                    <span className="font-medium">{code}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {PLATFORM_PERMISSION_META[code].description}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <label className="block text-sm">
            <span className="text-muted-foreground">Reason</span>
            <input
              className="platform-input mt-1"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <Button type="submit" size="sm" disabled={busy}>
            Save permissions
          </Button>
        </form>
      </Panel>
    </div>
  );
}
