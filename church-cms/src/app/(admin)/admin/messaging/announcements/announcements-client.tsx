'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Button,
  EmptyState,
  Menu,
  MenuItem,
  MenuSeparator,
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
import { formatDate } from '../../../_lib/format';
import { asList } from '../../../_lib/list';
import {
  CreateAnnouncementDialog,
  type AnnouncementRow,
} from './create-announcement-dialog';

function statusTone(status: string): StatusTone {
  switch (status) {
    case 'published':
      return 'success';
    case 'pending_approval':
      return 'pending';
    case 'rejected':
      return 'danger';
    case 'archived':
      return 'neutral';
    default:
      return 'info';
  }
}

/**
 * Admin announcements — list, open/edit, submit for approval, publish.
 */
export function AnnouncementsClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tm = useTranslations('AdminMessaging');
  const tc = useTranslations('Common');
  const { push } = useToast();
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const statusLabel = (status: string): string => {
    switch (status) {
      case 'draft':
        return tm('statusDraft');
      case 'pending_approval':
        return tm('statusPendingApproval');
      case 'published':
        return tm('statusPublished');
      case 'rejected':
        return tm('statusNeedsChanges');
      case 'archived':
        return tm('statusArchived');
      default:
        return status.replaceAll('_', ' ');
    }
  };

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<
        AnnouncementRow[] | { data: AnnouncementRow[] }
      >('/api/v1/announcements');
      setRows(asList(payload));
    } catch (err) {
      setRows([]);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : tm('unableLoadAnnouncements'),
      );
    } finally {
      setLoading(false);
    }
  }, [tm]);

  useLoadEffect(load);

  const runAction = async (
    id: string,
    action: 'submit' | 'publish' | 'reject',
  ): Promise<void> => {
    if (busyId) return;
    setBusyId(id);
    try {
      if (action === 'submit') {
        const result = await apiFetch<{
          announcement: AnnouncementRow;
          approvalRequestId: string;
        }>(`/api/v1/announcements/${id}/submit`, { method: 'POST' });
        setRows((prev) =>
          prev.map((r) => (r.id === id ? result.announcement : r)),
        );
        push({
          tone: 'success',
          message: tm('sentForApproval'),
        });
      } else if (action === 'reject') {
        const updated = await apiFetch<AnnouncementRow>(
          `/api/v1/announcements/${id}/reject`,
          { method: 'POST', json: {} },
        );
        setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
        push({ tone: 'success', message: tm('sentBack') });
      } else {
        const updated = await apiFetch<AnnouncementRow>(
          `/api/v1/announcements/${id}/publish`,
          { method: 'POST' },
        );
        setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
        push({ tone: 'success', message: tm('published') });
      }
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : tm('actionFailed'),
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('announcements')}
        lede={t('announcementsLede')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft="refresh"
              onClick={() => {
                void load().then(() =>
                  push({ tone: 'success', message: tm('announcementsRefreshed') }),
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
              {tm('newAnnouncement')}
            </Button>
          </div>
        }
      />

      {loading ? (
        <Panel title={tm('notices')}>
          <div className="flex flex-col gap-3 p-4">
            <Skeleton size="heading" />
            <Skeleton size="line" />
            <Skeleton size="line" />
          </div>
        </Panel>
      ) : error ? (
        <EmptyState
          icon="alert"
          tone="peach"
          title={tm('couldNotLoadAnnouncements')}
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              {tc('retry')}
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="bell"
          tone="peach"
          title={tm('noAnnouncementsYet')}
          description={tm('noAnnouncementsDesc')}
          action={
            <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
              {tm('newAnnouncement')}
            </Button>
          }
        />
      ) : (
        <Panel title={tm('allNotices')} flush>
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tm('colTitle')}</TH>
                  <TH>{tm('colStatus')}</TH>
                  <TH>{tm('colPublished')}</TH>
                  <TH className="w-12">
                    <span className="sr-only">{tm('actions')}</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => {
                  const canSubmit =
                    row.status === 'draft' || row.status === 'rejected';
                  const canPublishDirect = row.status === 'draft';
                  const canReject = row.status === 'pending_approval';
                  const hasActions =
                    canSubmit || canPublishDirect || canReject;
                  return (
                    <TR
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => setEditing(row)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setEditing(row);
                        }
                      }}
                      tabIndex={0}
                      aria-label={tm('openAnnouncementAria', { title: row.title })}
                    >
                      <TD>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">
                            {row.title}
                          </span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {row.body}
                          </span>
                        </div>
                      </TD>
                      <TD>
                        <StatusPill tone={statusTone(row.status)}>
                          {statusLabel(row.status)}
                        </StatusPill>
                      </TD>
                      <TD className="text-muted-foreground">
                        {row.publishedAt ? formatDate(row.publishedAt) : tm('dash')}
                      </TD>
                      <TD
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        {hasActions ? (
                          <Menu
                            align="end"
                            label={tm('actionsFor', { title: row.title })}
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={tm('actionsFor', { title: row.title })}
                                disabled={busyId === row.id}
                              >
                                <Icon name="more-horizontal" size={16} />
                              </Button>
                            }
                          >
                            <MenuItem
                              icon="edit"
                              onClick={() => setEditing(row)}
                            >
                              {tm('open')}
                            </MenuItem>
                            <MenuSeparator />
                            {canSubmit ? (
                              <MenuItem
                                icon="inbox"
                                onClick={() => {
                                  void runAction(row.id, 'submit');
                                }}
                              >
                                {tm('sendForApproval')}
                              </MenuItem>
                            ) : null}
                            {canPublishDirect ? (
                              <MenuItem
                                icon="check"
                                onClick={() => {
                                  void runAction(row.id, 'publish');
                                }}
                              >
                                {tm('publishNow')}
                              </MenuItem>
                            ) : null}
                            {canReject ? (
                              <MenuItem
                                icon="close"
                                destructive
                                onClick={() => {
                                  void runAction(row.id, 'reject');
                                }}
                              >
                                {tm('sendBack')}
                              </MenuItem>
                            ) : null}
                          </Menu>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(row)}
                          >
                            {tm('open')}
                          </Button>
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
        {tm('approvalNote')}
      </p>

      <CreateAnnouncementDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(row) => {
          setRows((prev) => [row, ...prev]);
          setCreateOpen(false);
          push({ tone: 'success', message: tm('draftSaved') });
        }}
      />

      <CreateAnnouncementDialog
        open={Boolean(editing)}
        announcement={editing}
        onClose={() => setEditing(null)}
        onCreated={() => undefined}
        onUpdated={(row) => {
          setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
          setEditing(null);
          push({ tone: 'success', message: tm('announcementSaved') });
        }}
      />
    </div>
  );
}
