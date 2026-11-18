'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
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
  const t = useTranslations('AdminPages');
  const tm = useTranslations('AdminMessaging');
  const tc = useTranslations('Common');
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
            : tm('unableLoadJobs'),
      );
    } finally {
      setLoading(false);
    }
  }, [tm]);

  useLoadEffect(load);

  const dispatchJob = async (id: string): Promise<void> => {
    if (busyId) return;
    setBusyId(id);
    try {
      const updated = await apiFetch<MessageJobRow>(
        `/api/v1/message-jobs/${id}/dispatch`,
        { method: 'POST' },
      );
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      push({ tone: 'success', message: tm('jobDispatched') });
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : tm('dispatchFailed'),
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('sendJobs')}
        lede={t('sendJobsLede')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft="refresh"
              onClick={() => {
                void load().then(() =>
                  push({ tone: 'success', message: tm('jobsRefreshed') }),
                );
              }}
            >
              {tm('refresh')}
            </Button>
            <Button
              size="sm"
              iconLeft="plus"
              onClick={() => setCreateOpen(true)}
            >
              {tm('newSend')}
            </Button>
          </div>
        }
      />

      {loading ? (
        <Panel title={tm('jobs')}>
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
          title={tm('couldNotLoadJobs')}
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              {tc('retry')}
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="inbox"
          tone="sky"
          title={tm('noJobsYet')}
          description={tm('noJobsDesc')}
          action={
            <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
              {tm('newSend')}
            </Button>
          }
        />
      ) : (
        <Panel title={tm('allJobs')} flush>
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tm('colJob')}</TH>
                  <TH>{tm('colChannel')}</TH>
                  <TH>{tm('colStatus')}</TH>
                  <TH>{tm('colRecipients')}</TH>
                  <TH>{tm('colCreated')}</TH>
                  <TH className="w-12">
                    <span className="sr-only">{tm('actions')}</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => {
                  const canDispatch =
                    row.status === 'queued' || row.status === 'failed';
                  const jobTitle = row.title ?? tm('untitledBlast');
                  return (
                    <TR key={row.id}>
                      <TD>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">
                            {jobTitle}
                          </span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {row.body ?? tm('dash')}
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
                            label={tm('actionsForJob', { title: jobTitle })}
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={tm('actionsForJob', { title: jobTitle })}
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
                              {tm('dispatchNow')}
                            </MenuItem>
                          </Menu>
                        ) : (
                          <span className="text-xs text-muted-foreground">{tm('dash')}</span>
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
        {tm('jobsNote')}
      </p>

      <CreateJobDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(row) => {
          setRows((prev) => [row, ...prev]);
          setCreateOpen(false);
          push({ tone: 'success', message: tm('jobQueued') });
        }}
      />
    </div>
  );
}
