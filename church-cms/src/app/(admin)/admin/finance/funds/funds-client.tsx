'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Button,
  EmptyState,
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
} from '@/app/_ekklesia/ui';
import type { Fund } from '../../../_lib/api-types';
import { asList } from '../../../_lib/list';
import { titleCase } from '../../../_lib/format';
import { CreateFundDialog } from './create-fund-dialog';

export function FundsClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tf = useTranslations('AdminFinance');
  const tc = useTranslations('Common');
  const { push } = useToast();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<Fund[] | { data: Fund[] }>('/api/v1/funds');
      setFunds(asList(payload));
    } catch (err) {
      setFunds([]);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : tf('unableLoadFunds'),
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  useLoadEffect(load);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('funds')}
        lede={t('fundsLede')}
        actions={
          <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
            {tf('newFund')}
          </Button>
        }
      />

      <Panel
        title={tf('allFunds')}
        subtitle={error ?? tf('fundsCountTotal', { count: funds.length })}
        flush
      >
        {error ? (
          <div className="px-5 py-8 text-center text-sm text-[color:var(--danger-ink)]">
            {error}
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={load}>
                {tc('retry')}
              </Button>
            </div>
          </div>
        ) : loading && funds.length === 0 ? (
          <div className="px-5 py-6 space-y-3">
            <Skeleton size="block" />
            <Skeleton size="block" />
          </div>
        ) : funds.length === 0 ? (
          <EmptyState
            icon="briefcase"
            tone="gold"
            title={tf('noFundsYet')}
            description={tf('noFundsBody')}
            action={
              <Button
                iconLeft="plus"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                {tf('newFund')}
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tf('code')}</TH>
                  <TH>{tf('name')}</TH>
                  <TH>{tf('type')}</TH>
                  <TH>{tf('status')}</TH>
                </TR>
              </THead>
              <TBody>
                {funds.map((f) => (
                  <TR key={f.id}>
                    <TD className="font-mono text-xs">{f.code}</TD>
                    <TD className="font-medium text-foreground">{f.name}</TD>
                    <TD className="text-sm text-muted-foreground">
                      {titleCase(f.fundType)}
                    </TD>
                    <TD>
                      <StatusPill
                        tone={f.status === 'active' ? 'success' : 'neutral'}
                      >
                        {f.status === 'active' ? tf('statusActive') : titleCase(f.status)}
                      </StatusPill>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <CreateFundDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(f) => {
          push({
            tone: 'success',
            title: tf('fundCreated'),
            message: tf('fundActiveMessage', { name: f.name }),
          });
          setCreateOpen(false);
          void load();
        }}
      />
    </div>
  );
}
