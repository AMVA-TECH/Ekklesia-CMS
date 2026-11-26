'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
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

type InAppItem = {
  id: string;
  channel: string;
  status: string;
  title: string | null;
  preview: string | null;
  churchName: string;
  churchId: string;
  createdAt: string;
  completedAt: string | null;
};

type Outbound = {
  id: string;
  channel: string;
  status: string;
  toMasked: string;
  createdAt: string;
};

export function NotificationsClient() {
  const [items, setItems] = useState<InAppItem[]>([]);
  const [outbound, setOutbound] = useState<Outbound[]>([]);
  const [windowDays, setWindowDays] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi<{
        items: InAppItem[];
        recentOutbound: Outbound[];
        windowDays: number;
      }>('/api/v1/platform/messaging/notifications?limit=100');
      setItems(res.items);
      setOutbound(res.recentOutbound);
      setWindowDays(res.windowDays);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useLoadEffect(load);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <ConsoleHeader
        area="messaging"
        tab="notifications"
        title="In-app notifications"
        description="Notifications shown in the member/admin bell, and recent external copies queued for SMS and email."
        actions={
          <Link
            href="/platform/messaging/delivery"
            className={buttonClassName({ variant: 'secondary', size: 'sm' })}
          >
            Delivery queue
          </Link>
        }
      />

      {error ? <p className="platform-error">{error}</p> : null}

      <Panel
        title="In-app jobs"
        subtitle={`Church announcement / in-app jobs · last ${windowDays} days`}
        flush
      >
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="chat"
            tone="sky"
            title="No in-app notifications recorded"
            description="Jobs with channel in_app appear here as churches publish announcements."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Church</TH>
                  <TH>Title</TH>
                  <TH>Status</TH>
                  <TH>Preview</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((row) => (
                  <TR key={row.id}>
                    <TD className="text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </TD>
                    <TD>
                      <Link
                        href={`/platform/churches/${row.churchId}`}
                        className="hover:underline"
                      >
                        {row.churchName}
                      </Link>
                    </TD>
                    <TD>{row.title ?? '—'}</TD>
                    <TD>
                      <Badge
                        tone={
                          row.status === 'failed'
                            ? 'danger'
                            : row.status === 'completed'
                              ? 'sage'
                              : 'neutral'
                        }
                      >
                        {row.status}
                      </Badge>
                    </TD>
                    <TD className="max-w-[16rem] truncate text-xs text-muted-foreground">
                      {row.preview ?? '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <Panel
        title="Recent external copies"
        subtitle="SMS and email deliveries related to notification traffic"
        flush
      >
        {loading ? (
          <Skeleton className="m-4 h-24 rounded-card" />
        ) : outbound.length === 0 ? (
          <EmptyState
            icon="globe"
            tone="neutral"
            title="No outbound copies yet"
            description="When SMS or email copies of notifications are queued, they show here."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Channel</TH>
                  <TH>Recipient</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {outbound.map((row) => (
                  <TR key={row.id}>
                    <TD className="text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </TD>
                    <TD>{row.channel}</TD>
                    <TD className="font-mono text-xs">{row.toMasked}</TD>
                    <TD>{row.status}</TD>
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
