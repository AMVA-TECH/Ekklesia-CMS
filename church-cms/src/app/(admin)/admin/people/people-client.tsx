'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Avatar,
  Button,
  EmptyState,
  PageHeader,
  Pagination,
  Panel,
  SearchField,
  Skeleton,
  Spinner,
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
import { Icon } from '@/app/_ekklesia/icons';
import type { ListEnvelope, ListMeta, Person } from '../../_lib/api-types';
import { formatDate } from '../../_lib/format';
import { CreatePersonDialog } from './create-person-dialog';

const PAGE_SIZE = 25;

/**
 * People directory list.
 *
 * Shows every person known to the active church with primary contact,
 * locale, and created date. Supports a debounced server-side search, cursor
 * pagination, and a "new person" dialog that reuses the `/api/v1/people`
 * POST endpoint.
 */
export function PeopleClient(): React.ReactElement {
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
  const [people, setPeople] = useState<Person[]>([]);
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the search field so we don't hammer the backend on every keystroke.
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
      const envelope = await apiFetch<ListEnvelope<Person> & { meta?: ListMeta }>(
        `/api/v1/people?${params.toString()}`,
      );
      setPeople([...envelope.data]);
      setMeta(envelope.meta ?? null);
    } catch (err) {
      setPeople([]);
      setMeta(null);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load people',
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
      // Walk the stack back by one.
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
        title="People"
        lede="Everyone known to your church. Add a visitor, update a contact, or tap a name for the full profile."
        actions={
          <Button iconLeft="user-plus" onClick={() => setCreateOpen(true)}>
            Add a person
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="max-w-md flex-1">
          <SearchField
            label="Search people"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="xs" label="Loading people" /> Loading…
            </span>
          ) : (
            `${people.length} of this page`
          )}
        </p>
      </div>

      <Panel
        title={debouncedSearch ? `Results for "${debouncedSearch}"` : 'Directory'}
        subtitle={
          error
            ? 'We couldn\'t load everyone — try again below.'
            : 'Sorted alphabetically.'
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
        ) : loading && people.length === 0 ? (
          <div className="px-5 py-6">
            <Skeleton size="block" />
            <Skeleton size="block" className="mt-3" />
          </div>
        ) : people.length === 0 ? (
          <EmptyState
            icon="users"
            tone="sage"
            title={debouncedSearch ? 'Nobody matched' : 'No people yet'}
            description={
              debouncedSearch
                ? 'Try a shorter query or clear the search to see everyone.'
                : 'Add a first person to start building your directory.'
            }
            action={
              debouncedSearch ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearch('')}
                >
                  Clear search
                </Button>
              ) : (
                <Button
                  iconLeft="user-plus"
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                >
                  Add a person
                </Button>
              )
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Name</TH>
                  <TH>Primary contact</TH>
                  <TH>Directory</TH>
                  <TH>Added</TH>
                  <TH className="w-12" />
                </TR>
              </THead>
              <TBody>
                {people.map((p) => (
                  <PersonRow key={p.id} person={p} />
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      {people.length > 0 || page > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          disabled={loading}
        />
      ) : null}

      <CreatePersonDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(person) => {
          push({
            tone: 'success',
            title: 'Person added',
            message: `${person.displayName} is now in your directory.`,
          });
          setCreateOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function PersonRow({ person }: { person: Person }): React.ReactElement {
  const primary =
    person.contacts.find((c) => c.isPrimary) ?? person.contacts[0] ?? null;
  return (
    <TR>
      <TD>
        <Link
          href={`/admin/people/${person.id}`}
          className="flex items-center gap-3 focus-ring rounded-sm"
        >
          <Avatar name={person.displayName} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{person.displayName}</p>
            {person.fullName && person.fullName !== person.displayName ? (
              <p className="text-xs text-muted-foreground">{person.fullName}</p>
            ) : null}
          </div>
        </Link>
      </TD>
      <TD>
        {primary ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            <Icon
              name={primary.channel === 'email' ? 'mail' : 'phone'}
              size={14}
              className="text-muted-foreground"
            />
            {primary.value}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No contact</span>
        )}
      </TD>
      <TD>
        {person.directoryOptIn ? (
          <StatusPill tone="success" hideDot>
            Opted in
          </StatusPill>
        ) : (
          <span className="text-xs text-muted-foreground">Private</span>
        )}
      </TD>
      <TD className="text-sm text-muted-foreground">
        {formatDate(person.createdAt)}
      </TD>
      <TD className="text-right">
        <Link
          href={`/admin/people/${person.id}`}
          aria-label={`Open ${person.displayName}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-ring"
        >
          <Icon name="chevron-right" size={16} />
        </Link>
      </TD>
    </TR>
  );
}
