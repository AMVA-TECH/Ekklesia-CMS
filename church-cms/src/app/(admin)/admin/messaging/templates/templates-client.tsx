'use client';

import { useTranslations } from 'next-intl';
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

/**
 * Message templates list + create/edit for non-technical church staff.
 */
export function TemplatesClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tm = useTranslations('AdminMessaging');
  const tc = useTranslations('Common');
  const tLocale = useTranslations('Locale');
  const { push } = useToast();
  const [rows, setRows] = useState<MessageTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplateRow | null>(null);

  const localeLabel = (locale: string): string => {
    if (locale === 'en' || locale === 'sw') return tLocale(locale);
    return locale.toUpperCase();
  };

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
            : tm('unableLoadTemplates'),
      );
    } finally {
      setLoading(false);
    }
  }, [tm]);

  useLoadEffect(load);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('templates')}
        lede={t('templatesLede')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft="refresh"
              onClick={() => {
                void load().then(() =>
                  push({ tone: 'success', message: tm('templatesRefreshed') }),
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
              {tm('newTemplate')}
            </Button>
          </div>
        }
      />

      {loading ? (
        <Panel title={tm('templates')}>
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
          title={tm('couldNotLoadTemplates')}
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              {tc('retry')}
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="mail"
          tone="sky"
          title={tm('noTemplatesYet')}
          description={tm('noTemplatesDesc')}
          action={
            <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
              {tm('newTemplate')}
            </Button>
          }
        />
      ) : (
        <Panel title={tm('allTemplates')} flush>
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tm('colName')}</TH>
                  <TH>{tm('colSendAs')}</TH>
                  <TH>{tm('colLanguage')}</TH>
                  <TH>{tm('colMessage')}</TH>
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
                    aria-label={tm('editTemplateAria', { name: row.name })}
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
                      {localeLabel(row.locale)}
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
          push({ tone: 'success', message: tm('templateCreated') });
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
          push({ tone: 'success', message: tm('templateSaved') });
        }}
      />
    </div>
  );
}
