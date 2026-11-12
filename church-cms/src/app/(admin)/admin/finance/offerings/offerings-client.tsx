'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
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
            : 'Unable to load offerings.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
        title: 'Offering posted',
        message: formatMoney(offering.amountMinor, offering.currency),
      });
      void load();
    } catch (err) {
      push({
        tone: 'danger',
        title: 'Could not post offering',
        message:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Something went wrong.',
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
        title="Offerings"
        lede="Record Sunday collections and other gifts. Post them to the ledger when you're ready."
        actions={
          <Button
            iconLeft="plus"
            onClick={() => setCreateOpen(true)}
            disabled={funds.length === 0}
          >
            Record offering
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Total recorded"
          value={loading ? '—' : formatMoney(total, currency)}
          icon="coin"
          tone="peach"
        />
        <Metric
          label="Posted to ledger"
          value={loading ? '—' : formatMoney(postedTotal, currency)}
          icon="check-circle"
          tone="sage"
        />
        <Metric
          label="Draft"
          value={loading ? '—' : formatMoney(pendingTotal, currency)}
          icon="clock"
          tone="gold"
        />
      </div>

      {funds.length === 0 && !loading ? (
        <div className="rounded-md border border-[color:var(--warning-soft)] bg-[color:var(--warning-soft)] px-3 py-2 text-sm text-[color:var(--warning-ink)]">
          Create a fund first so you can direct offerings to it.
        </div>
      ) : null}

      <Panel title="All offerings" subtitle={error ?? undefined} flush>
        {error ? (
          <div className="px-5 py-8 text-center text-sm text-[color:var(--danger-ink)]">
            {error}
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={load}>
                Try again
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
            title="No offerings recorded"
            description="Record a Sunday collection to track giving over time."
            action={
              <Button
                iconLeft="plus"
                size="sm"
                onClick={() => setCreateOpen(true)}
                disabled={funds.length === 0}
              >
                Record offering
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Service date</TH>
                  <TH>Amount</TH>
                  <TH>Fund</TH>
                  <TH>Status</TH>
                  <TH>Note</TH>
                  <TH className="w-28">
                    <span className="sr-only">Actions</span>
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
                            Posted
                          </StatusPill>
                        ) : (
                          <StatusPill tone="pending" hideDot>
                            Draft
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
                                ? 'Post this offering to the ledger'
                                : 'Income and deposit accounts are required to post'
                            }
                            onClick={() => {
                              void handlePost(o);
                            }}
                          >
                            Post
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
            title: 'Offering recorded',
            message: formatMoney(o.amountMinor, o.currency),
          });
          setCreateOpen(false);
          void load();
        }}
      />
    </div>
  );
}
