'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Pagination,
  Panel,
  SearchField,
  Skeleton,
  Spinner,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type { Household, ListEnvelope, ListMeta } from '../../_lib/api-types';
import { CreateHouseholdDialog } from './create-household-dialog';

const PAGE_SIZE = 25;

export function HouseholdsClient(): React.ReactElement {
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
      setCursor(null);
      setCursorStack([null]);
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (cursor) params.set('cursor', cursor);
    try {
      const envelope = await apiFetch<
        ListEnvelope<Household> & { meta?: ListMeta }
      >(`/api/v1/households?${params.toString()}`);
      setHouseholds([...envelope.data]);
      setMeta(envelope.meta ?? null);
    } catch (err) {
      setHouseholds([]);
      setMeta(null);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load households',
      );
    } finally {
      setLoading(false);
    }
  }, [cursor, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePageChange = (next: number): void => {
    if (next < 1) return;
    if (next < page) {
      const stack = cursorStack.slice(0, next);
      setCursorStack(stack);
      setCursor(stack[stack.length - 1] ?? null);
      setPage(next);
    } else if (next > page && meta?.nextCursor) {
      setCursorStack([...cursorStack, meta.nextCursor]);
      setCursor(meta.nextCursor);
      setPage(next);
    }
  };

  const hasMore = meta?.hasMore ?? false;
  const totalPages = hasMore ? page + 1 : page;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Households"
        lede="Families and groups sharing a home or a primary contact. Add a household when a family wants to be contacted as one."
        actions={
          <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
            New household
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="max-w-md flex-1">
          <SearchField
            label="Search households"
            placeholder="Search by label"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="xs" label="Loading" /> Loading…
            </span>
          ) : (
            `${households.length} shown`
          )}
        </p>
      </div>

      <Panel
        title={
          debouncedSearch
            ? `Results for "${debouncedSearch}"`
            : 'All households'
        }
        subtitle={
          error
            ? 'We couldn\'t load households.'
            : 'Grouped by label.'
        }
        flush
      >
        {error ? (
          <div className="px-5 py-10 text-center text-sm text-[color:var(--danger-ink)]">
            {error}
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={load}>
                Try again
              </Button>
            </div>
          </div>
        ) : loading && households.length === 0 ? (
          <div className="px-5 py-6">
            <Skeleton size="block" />
            <Skeleton size="block" className="mt-3" />
          </div>
        ) : households.length === 0 ? (
          <EmptyState
            icon="building"
            tone="peach"
            title={debouncedSearch ? 'No matches' : 'No households yet'}
            description={
              debouncedSearch
                ? 'Try another label, or clear the search.'
                : 'Add the first family to start grouping members.'
            }
            action={
              <Button
                size="sm"
                iconLeft="plus"
                onClick={() => setCreateOpen(true)}
              >
                New household
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Household</TH>
                  <TH>Members</TH>
                  <TH>Children</TH>
                  <TH>Emergency contact</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {households.map((h) => (
                  <TR key={h.id}>
                    <TD>
                      <Link
                        href={`/admin/households/${h.id}`}
                        className="focus-ring rounded-sm"
                      >
                        <p className="font-medium text-foreground">{h.label}</p>
                        {h.sharedAddress ? (
                          <p className="text-xs text-muted-foreground">
                            {h.sharedAddress}
                          </p>
                        ) : null}
                      </Link>
                    </TD>
                    <TD>
                      <Badge tone="sage">{h.members.length}</Badge>
                    </TD>
                    <TD>
                      <Badge tone={h.children.length ? 'lavender' : 'neutral'}>
                        {h.children.length}
                      </Badge>
                    </TD>
                    <TD>
                      {h.emergencyContactName ? (
                        <span>
                          <p className="text-sm text-foreground">
                            {h.emergencyContactName}
                          </p>
                          {h.emergencyContactPhone ? (
                            <p className="text-xs text-muted-foreground">
                              {h.emergencyContactPhone}
                            </p>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Not set
                        </span>
                      )}
                    </TD>
                    <TD className="text-right">
                      <Link
                        href={`/admin/households/${h.id}`}
                        aria-label={`Open ${h.label}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-ring"
                      >
                        <Icon name="chevron-right" size={16} />
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      {households.length > 0 || page > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          disabled={loading}
        />
      ) : null}

      <CreateHouseholdDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(h) => {
          push({
            tone: 'success',
            title: 'Household added',
            message: `${h.label} is on your list.`,
          });
          setCreateOpen(false);
          void load();
        }}
      />
    </div>
  );
}
