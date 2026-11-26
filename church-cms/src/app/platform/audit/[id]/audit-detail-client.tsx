'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLoadEffect } from '@/app/_ekklesia/session';
import {
  Badge,
  EmptyState,
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
import { humanizePlatformError, platformApi } from '../../platform-api';

type Detail = {
  scope: 'platform' | 'tenant';
  event: {
    id: string;
    action: string;
    outcome: string;
    actorUserId: string | null;
    actorEmail: string;
    churchId: string | null;
    churchName: string;
    entityType: string;
    entityId: string | null;
    requestId: string | null;
    reason: string | null;
    metadata: Record<string, unknown>;
    relatedHref: string | null;
    createdAt: string;
  };
  related: Array<{
    id: string;
    action: string;
    outcome: string;
    entityType: string;
    href: string;
    createdAt: string;
  }>;
};

export function AuditDetailClient({ eventId }: { eventId: string }) {
  const searchParams = useSearchParams();
  const scope =
    searchParams.get('scope') === 'tenant' ? 'tenant' : 'platform';
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi<Detail>(
        `/api/v1/platform/audit-events/${eventId}?scope=${scope}`,
      );
      setData(res);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setLoading(false);
    }
  }, [eventId, scope]);

  useLoadEffect(load);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="h-48 rounded-card" />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon="file"
        tone="peach"
        title="Event not found"
        description={error ?? 'This audit event could not be loaded.'}
        action={
          <Link
            href={`/platform/audit${scope === 'tenant' ? '?scope=tenant' : ''}`}
            className={buttonClassName({ variant: 'secondary', size: 'sm' })}
          >
            Back to audit
          </Link>
        }
      />
    );
  }

  const { event, related } = data;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <ConsoleHeader
        area="audit"
        tab={scope}
        title={event.action}
        description={`${scope === 'tenant' ? 'Tenant' : 'Platform'} audit event · ${new Date(event.createdAt).toLocaleString()}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge
              tone={
                event.outcome === 'success'
                  ? 'sage'
                  : event.outcome === 'denied'
                    ? 'warning'
                    : 'danger'
              }
            >
              {event.outcome}
            </Badge>
            {event.relatedHref ? (
              <Link
                href={event.relatedHref}
                className={buttonClassName({
                  variant: 'secondary',
                  size: 'sm',
                })}
              >
                Open related record
              </Link>
            ) : null}
          </div>
        }
      />

      {error ? <p className="platform-error">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Summary">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-2 border-b border-border pb-2">
              <dt className="text-muted-foreground">Actor</dt>
              <dd>{event.actorEmail}</dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-2">
              <dt className="text-muted-foreground">Church</dt>
              <dd>
                {event.churchId ? (
                  <Link
                    href={`/platform/churches/${event.churchId}`}
                    className="hover:underline"
                  >
                    {event.churchName}
                  </Link>
                ) : (
                  event.churchName
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-2">
              <dt className="text-muted-foreground">Entity</dt>
              <dd className="text-right">
                {event.entityType}
                {event.entityId ? (
                  <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                    {event.entityId}
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="flex justify-between gap-2 border-b border-border pb-2">
              <dt className="text-muted-foreground">Request id</dt>
              <dd className="max-w-[14rem] truncate font-mono text-xs">
                {event.requestId ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="max-w-[16rem] text-right">{event.reason ?? '—'}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Metadata" subtitle="Sensitive fields redacted">
          {Object.keys(event.metadata).length === 0 ? (
            <p className="text-sm text-muted-foreground">No metadata recorded.</p>
          ) : (
            <pre className="max-h-80 overflow-auto rounded-xl border border-border bg-surface-muted p-3 font-mono text-xs leading-5">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          )}
        </Panel>
      </div>

      {related.length > 0 ? (
        <Panel
          title="Related by request"
          subtitle="Other events sharing this request id"
          flush
        >
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Action</TH>
                  <TH>Outcome</TH>
                  <TH>Entity</TH>
                </TR>
              </THead>
              <TBody>
                {related.map((row) => (
                  <TR key={row.id}>
                    <TD className="text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </TD>
                    <TD>
                      <Link href={row.href} className="hover:underline">
                        {row.action}
                      </Link>
                    </TD>
                    <TD>{row.outcome}</TD>
                    <TD>{row.entityType}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Panel>
      ) : null}

      <p>
        <Link
          href={`/platform/audit${scope === 'tenant' ? '?scope=tenant' : ''}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to audit list
        </Link>
      </p>
    </div>
  );
}
