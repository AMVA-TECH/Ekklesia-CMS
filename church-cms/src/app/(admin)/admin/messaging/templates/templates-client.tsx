'use client';

import { useCallback, useState } from 'react';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  EmptyState,
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
  useToast,
} from '@/app/_ekklesia/ui';
import { titleCase } from '../../../_lib/format';
import { asList } from '../../../_lib/list';
import {
  CreateTemplateDialog,
  type MessageTemplateRow,
} from './create-template-dialog';
import { t } from '@/app/_ekklesia/i18n/core';

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  sw: 'Kiswahili',
};

/**
 * Message templates list + create/edit for non-technical church staff.
 */
export function TemplatesClient(): React.ReactElement {
  const { push } = useToast();
  const [rows, setRows] = useState<MessageTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplateRow | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<
        MessageTemplateRow[] | { data: MessageTemplateRow[] }
      >('/api/v1/message-templates');
      setRows(
        asList(payload).map((row) => ({
          ...row,
          name: row.name || titleCase(row.code.replaceAll('_', ' ')),
        })),
      );
    } catch (err) {
      setRows([]);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('Unable to load templates'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useLoadEffect(load);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('Message templates')}
        lede={t('Saved messages you can reuse when texting the church.')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft="refresh"
              onClick={() => {
                void load().then(() =>
                  push({ tone: 'success', message: t('Templates refreshed.') }),
                );
              }}
            >
              {t('Refresh')}
            </Button>
            <Button
              size="sm"
              iconLeft="plus"
              onClick={() => setCreateOpen(true)}
            >
              {t('New template')}
            </Button>
          </div>
        }
      />

      {loading ? (
        <Panel title={t('Templates')}>
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
          title={t('Could not load templates')}
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              {t('Try again')}
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="mail"
          tone="sky"
          title={t('No saved messages yet')}
          description={t('Create a welcome or reminder once, then pick it when you send a message.')}
          action={
            <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
              {t('New template')}
            </Button>
          }
        />
      ) : (
        <Panel title={t('All templates')} flush>
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{t('Name')}</TH>
                  <TH>{t('Send as')}</TH>
                  <TH>{t('Language')}</TH>
                  <TH>{t('Message')}</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => (
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
                    aria-label={t('Edit template {0}', row.name)}
                  >
                    <TD>
                      <span className="font-medium text-foreground">
                        {row.name}
                      </span>
                    </TD>
                    <TD>
                      <Badge tone="neutral">
                        {titleCase(row.channel.replaceAll('_', ' '))}
                      </Badge>
                    </TD>
                    <TD className="text-muted-foreground">
                      {LOCALE_LABELS[row.locale] ?? row.locale.toUpperCase()}
                    </TD>
                    <TD>
                      <span className="line-clamp-2 text-sm text-muted-foreground">
                        {row.body}
                      </span>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Panel>
      )}

      <CreateTemplateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(row) => {
          setRows((prev) => [row, ...prev]);
          setCreateOpen(false);
          push({ tone: 'success', message: t('Template created.') });
        }}
      />

      <CreateTemplateDialog
        open={Boolean(editing)}
        template={editing}
        onClose={() => setEditing(null)}
        onCreated={() => undefined}
        onUpdated={(row) => {
          setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
          setEditing(null);
          push({ tone: 'success', message: t('Template saved.') });
        }}
      />
    </div>
  );
}
