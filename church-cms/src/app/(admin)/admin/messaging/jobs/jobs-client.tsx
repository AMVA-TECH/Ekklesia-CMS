'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Button,
  EmptyState,
  Menu,
  MenuItem,
  PageHeader,
  Panel,
  Skeleton,
  StatusPill,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
  type StatusTone,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import { formatDate, titleCase } from '../../../_lib/format';
import { asList } from '../../../_lib/list';
import { CreateJobDialog, type MessageJobRow } from './create-job-dialog';

function statusTone(status: string): StatusTone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'queued':
      return 'pending';
    case 'sending':
      return 'info';
    case 'failed':
      return 'danger';
    case 'cancelled':
      return 'neutral';
    default:
      return 'info';
  }
}

/**
 * Leadership send jobs — list, queue, and dispatch SMS/WhatsApp blasts.
 */
export function JobsClient(): React.ReactElement {
  const { push } = useToast();
  const [rows, setRows] = useState<MessageJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<
        MessageJobRow[] | { data: MessageJobRow[] }
      >('/api/v1/message-jobs');
      setRows(asList(payload));
    } catch (err) {
      setRows([]);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load message jobs',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dispatchJob = async (id: string): Promise<void> => {
    if (busyId) return;
    setBusyId(id);
    try {
      const updated = await apiFetch<MessageJobRow>(
        `/api/v1/message-jobs/${id}/dispatch`,
        { method: 'POST' },
      );
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      push({ tone: 'success', message: 'Job dispatched.' });
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Dispatch failed.',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Send jobs"
        lede="Queue and dispatch SMS or WhatsApp blasts to opted-in members."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft="refresh"
              onClick={() => {
                void load().then(() =>
                  push({ tone: 'success', message: 'Jobs refreshed.' }),
                );
              }}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              iconLeft="plus"
              onClick={() => setCreateOpen(true)}
            >
              New send
            </Button>
          </div>
        }
      />

      {loading ? (
        <Panel title="Jobs">
          <div className="flex flex-col gap-3 p-4">
            <Skeleton size="heading" />
            <Skeleton size="line" />
            <Skeleton size="line" />
          </div>
        </Panel>
      ) : error ? (
        <EmptyState
          icon="alert"
          tone="sky"
          title="Could not load send jobs"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="inbox"
          tone="sky"
          title="No send jobs yet"
          description="Queue a leadership blast, then dispatch when you are ready to send."
          action={
            <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
              New send
            </Button>
          }
        />
      ) : (
        <Panel title="All jobs" flush>
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Job</TH>
                  <TH>Channel</TH>
                  <TH>Status</TH>
                  <TH>Recipients</TH>
                  <TH>Created</TH>
                  <TH className="w-12">
                    <span className="sr-only">Actions</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => {
                  const canDispatch =
                    row.status === 'queued' || row.status === 'failed';
                  return (
                    <TR key={row.id}>
                      <TD>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">
                            {row.title ?? 'Untitled blast'}
                          </span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {row.body ?? '—'}
                          </span>
                        </div>
                      </TD>
                      <TD className="text-muted-foreground">
                        {titleCase(row.channel.replaceAll('_', ' '))}
                      </TD>
                      <TD>
                        <StatusPill tone={statusTone(row.status)}>
                          {titleCase(row.status.replaceAll('_', ' '))}
                        </StatusPill>
                      </TD>
                      <TD className="text-muted-foreground">
                        {row.recipientCount}
                      </TD>
                      <TD className="text-muted-foreground">
                        {formatDate(row.createdAt)}
                      </TD>
                      <TD>
                        {canDispatch ? (
                          <Menu
                            align="end"
                            label={`Actions for ${row.title ?? 'job'}`}
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Actions for ${row.title ?? 'job'}`}
                                disabled={busyId === row.id}
                              >
                                <Icon name="more-horizontal" size={16} />
                              </Button>
                            }
                          >
                            <MenuItem
                              icon="inbox"
                              onClick={() => {
                                void dispatchJob(row.id);
                              }}
                            >
                              Dispatch now
                            </MenuItem>
                          </Menu>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        </Panel>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon name="alert-circle" size={14} />
        Create queues recipients with consent checks. Dispatch pushes pending
        deliveries through the configured notify provider.
      </p>

      <CreateJobDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(row) => {
          setRows((prev) => [row, ...prev]);
          setCreateOpen(false);
          push({ tone: 'success', message: 'Send job queued.' });
        }}
      />
    </div>
  );
}
