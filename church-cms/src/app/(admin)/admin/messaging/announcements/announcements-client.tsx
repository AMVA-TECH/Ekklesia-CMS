'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
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
import { formatDate, titleCase } from '../../../_lib/format';
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
 * Admin announcements — list, create draft, submit for approval, publish.
 */
export function AnnouncementsClient(): React.ReactElement {
  const { push } = useToast();
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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
            : 'Unable to load announcements',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
          message: 'Submitted for approval.',
        });
      } else if (action === 'reject') {
        const updated = await apiFetch<AnnouncementRow>(
          `/api/v1/announcements/${id}/reject`,
          { method: 'POST', json: {} },
        );
        setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
        push({ tone: 'success', message: 'Announcement rejected.' });
      } else {
        const updated = await apiFetch<AnnouncementRow>(
          `/api/v1/announcements/${id}/publish`,
          { method: 'POST' },
        );
        setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
        push({ tone: 'success', message: 'Announcement published.' });
      }
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Action failed.',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Announcements"
        lede="Church-wide notices and updates for your congregation."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft="refresh"
              onClick={() => {
                void load().then(() =>
                  push({ tone: 'success', message: 'Announcements refreshed.' }),
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
              New announcement
            </Button>
          </div>
        }
      />

      {loading ? (
        <Panel title="Notices">
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
          title="Could not load announcements"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="bell"
          tone="peach"
          title="No announcements yet"
          description="Draft a notice for your church family — then submit for approval or publish."
          action={
            <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
              New announcement
            </Button>
          }
        />
      ) : (
        <Panel title="All notices" flush>
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Title</TH>
                  <TH>Status</TH>
                  <TH>Published</TH>
                  <TH className="w-12">
                    <span className="sr-only">Actions</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => {
                  const canSubmit =
                    row.status === 'draft' || row.status === 'rejected';
                  // Direct publish only from draft (API rejects pending/rejected).
                  const canPublishDirect = row.status === 'draft';
                  const canReject = row.status === 'pending_approval';
                  const hasActions =
                    canSubmit || canPublishDirect || canReject;
                  return (
                    <TR key={row.id}>
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
                          {titleCase(row.status.replaceAll('_', ' '))}
                        </StatusPill>
                      </TD>
                      <TD className="text-muted-foreground">
                        {row.publishedAt ? formatDate(row.publishedAt) : '—'}
                      </TD>
                      <TD>
                        {hasActions ? (
                          <Menu
                            align="end"
                            label={`Actions for ${row.title}`}
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Actions for ${row.title}`}
                                disabled={busyId === row.id}
                              >
                                <Icon name="more-horizontal" size={16} />
                              </Button>
                            }
                          >
                            {canSubmit ? (
                              <MenuItem
                                icon="inbox"
                                onClick={() => {
                                  void runAction(row.id, 'submit');
                                }}
                              >
                                Submit for approval
                              </MenuItem>
                            ) : null}
                            {canSubmit && canPublishDirect ? (
                              <MenuSeparator />
                            ) : null}
                            {canPublishDirect ? (
                              <MenuItem
                                icon="check"
                                onClick={() => {
                                  void runAction(row.id, 'publish');
                                }}
                              >
                                Publish now
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
                                Reject
                              </MenuItem>
                            ) : null}
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
        Church-wide notices need dual-control approval after submit. Direct
        publish is available when your role includes publish rights.
      </p>

      <CreateAnnouncementDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(row) => {
          setRows((prev) => [row, ...prev]);
          setCreateOpen(false);
          push({ tone: 'success', message: 'Draft saved.' });
        }}
      />
    </div>
  );
}
