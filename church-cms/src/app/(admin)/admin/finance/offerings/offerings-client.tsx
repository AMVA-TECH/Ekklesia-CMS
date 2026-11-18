'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Button,
  EmptyState,
  Metric,
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
import type { Fund, Offering } from '../../../_lib/api-types';
import { formatDate, formatMoney } from '../../../_lib/format';
import { asList } from '../../../_lib/list';
import { CreateOfferingDialog } from './create-offering-dialog';

export function OfferingsClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tf = useTranslations('AdminFinance');
  const tc = useTranslations('Common');
  const { push } = useToast();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [postingId, setPostingId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [offRes, fundRes] = await Promise.all([
        apiFetch<Offering[] | { data: Offering[] }>(
          '/api/v1/offerings?limit=100',
        ),
        apiFetch<Fund[] | { data: Fund[] }>('/api/v1/funds'),
      ]);
      setOfferings(asList(offRes));
      setFunds(asList(fundRes));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : tf('unableLoadOfferings'),
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  useLoadEffect(load);

  const isPosted = (o: Offering): boolean =>
    Boolean(o.journalId || o.postedAt);

  const handlePost = async (offering: Offering): Promise<void> => {
    if (postingId || isPosted(offering)) return;
    setPostingId(offering.id);
    try {
      await apiFetch<Offering>(`/api/v1/offerings/${offering.id}/post`, {
        method: 'POST',
      });
      push({
        tone: 'success',
        title: tf('offeringPosted'),
        message: formatMoney(offering.amountMinor, offering.currency),
      });
      void load();
    } catch (err) {
      push({
        tone: 'danger',
        title: tf('couldNotPostOffering'),
        message:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : tf('somethingWrong'),
      });
    } finally {
      setPostingId(null);
    }
  };

  const currency = offerings[0]?.currency ?? 'TZS';
  const total = offerings.reduce((sum, o) => sum + (o.amountMinor ?? 0), 0);
  const postedTotal = offerings
    .filter((o) => isPosted(o))
    .reduce((sum, o) => sum + (o.amountMinor ?? 0), 0);
  const pendingTotal = total - postedTotal;
  const fundMap = Object.fromEntries(funds.map((f) => [f.id, f] as const));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('offerings')}
        lede={t('offeringsLede')}
        actions={
          <Button
            iconLeft="plus"
            onClick={() => setCreateOpen(true)}
            disabled={funds.length === 0}
          >
            {tf('recordOffering')}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label={tf('totalRecorded')}
          value={loading ? '—' : formatMoney(total, currency)}
          icon="coin"
          tone="peach"
        />
        <Metric
          label={tf('postedToLedger')}
          value={loading ? '—' : formatMoney(postedTotal, currency)}
          icon="check-circle"
          tone="sage"
        />
        <Metric
          label={tf('draft')}
          value={loading ? '—' : formatMoney(pendingTotal, currency)}
          icon="clock"
          tone="gold"
        />
      </div>

      {funds.length === 0 && !loading ? (
        <div className="rounded-md border border-[color:var(--warning-soft)] bg-[color:var(--warning-soft)] px-3 py-2 text-sm text-[color:var(--warning-ink)]">
          {tf('createFundFirst')}
        </div>
      ) : null}

      <Panel title={tf('allOfferings')} subtitle={error ?? undefined} flush>
        {error ? (
          <div className="px-5 py-8 text-center text-sm text-[color:var(--danger-ink)]">
            {error}
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={load}>
                {tc('retry')}
              </Button>
            </div>
          </div>
        ) : loading && offerings.length === 0 ? (
          <div className="px-5 py-6 space-y-3">
            <Skeleton size="block" />
            <Skeleton size="block" />
          </div>
        ) : offerings.length === 0 ? (
          <EmptyState
            icon="coin"
            tone="peach"
            title={tf('noOfferingsRecorded')}
            description={tf('noOfferingsBody')}
            action={
              <Button
                iconLeft="plus"
                size="sm"
                onClick={() => setCreateOpen(true)}
                disabled={funds.length === 0}
              >
                {tf('recordOffering')}
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tf('serviceDate')}</TH>
                  <TH>{tf('amount')}</TH>
                  <TH>{tf('fund')}</TH>
                  <TH>{tf('status')}</TH>
                  <TH>{tf('note')}</TH>
                  <TH className="w-28">
                    <span className="sr-only">{tf('actions')}</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {offerings.map((o) => {
                  const posted = isPosted(o);
                  const canPost =
                    !posted &&
                    Boolean(o.incomeAccountId && o.depositAccountId);
                  return (
                    <TR key={o.id}>
                      <TD className="text-sm">{formatDate(o.serviceDate)}</TD>
                      <TD className="font-medium tabular-nums">
                        {formatMoney(o.amountMinor, o.currency)}
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {o.fundId ? fundMap[o.fundId]?.name ?? '—' : '—'}
                      </TD>
                      <TD>
                        {posted ? (
                          <StatusPill tone="success" hideDot>
                            {tf('posted')}
                          </StatusPill>
                        ) : (
                          <StatusPill tone="pending" hideDot>
                            {tf('draft')}
                          </StatusPill>
                        )}
                      </TD>
                      <TD className="text-sm text-muted-foreground max-w-xs truncate">
                        {o.note ?? '—'}
                      </TD>
                      <TD>
                        {!posted ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={postingId === o.id}
                            disabled={!canPost || postingId !== null}
                            title={
                              canPost
                                ? tf('postOfferingTitle')
                                : tf('accountsRequiredToPost')
                            }
                            onClick={() => {
                              void handlePost(o);
                            }}
                          >
                            {tf('post')}
                          </Button>
                        ) : null}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <CreateOfferingDialog
        open={createOpen}
        funds={funds}
        onClose={() => setCreateOpen(false)}
        onCreated={(o) => {
          push({
            tone: 'success',
            title: tf('offeringRecorded'),
            message: formatMoney(o.amountMinor, o.currency),
          });
          setCreateOpen(false);
          void load();
        }}
      />
    </div>
  );
}
