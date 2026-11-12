'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
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
            : 'Unable to load funds.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Funds"
        lede="How giving is categorised — general offerings, designated projects, and restricted funds."
        actions={
          <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
            New fund
          </Button>
        }
      />

      <Panel
        title="All funds"
        subtitle={error ?? `${funds.length} total`}
        flush
      >
        {error ? (
          <div className="px-5 py-8 text-center text-sm text-[color:var(--danger-ink)]">
            {error}
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={load}>
                Try again
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
            title="No funds yet"
            description="Add a general fund to start, then add project-specific funds as needed."
            action={
              <Button
                iconLeft="plus"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                New fund
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Code</TH>
                  <TH>Name</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
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
                        {titleCase(f.status)}
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
            title: 'Fund created',
            message: `${f.name} is active.`,
          });
          setCreateOpen(false);
          void load();
        }}
      />
    </div>
  );
}
