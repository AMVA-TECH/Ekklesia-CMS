'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
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
  buttonClassName,
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
  const t = useTranslations('AdminPages');
  const tp = useTranslations('AdminPeople');
  const tc = useTranslations('Common');
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
            : tp('unableLoadPeople'),
      );
    } finally {
      setLoading(false);
    }
  }, [cursor, debouncedSearch, tp]);

  useLoadEffect(load);

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
        title={t('people')}
        lede={t('peopleLede')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/people/import"
              className={buttonClassName({ variant: 'secondary' })}
            >
              {t('import')}
            </Link>
            <Button iconLeft="user-plus" onClick={() => setCreateOpen(true)}>
              {t('addPerson')}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="max-w-md flex-1">
          <SearchField
            label={t('searchPeople')}
            placeholder={t('searchByName')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="xs" label={tp('loadingPeople')} /> {tp('loadingEllipsis')}
            </span>
          ) : (
            tp('pageCount', { count: people.length })
          )}
        </p>
      </div>

      <Panel
        title={
          debouncedSearch
            ? tp('resultsFor', { query: debouncedSearch })
            : tp('directory')
        }
        subtitle={
          error ? tp('loadErrorSubtitle') : tp('sortedAlphabetically')
        }
        flush
      >
        {error ? (
          <div className="px-5 py-10 text-center text-sm text-[color:var(--danger-ink)]">
            {error}
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={load}>
                {tc('retry')}
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
            title={debouncedSearch ? tp('nobodyMatched') : tp('noPeopleYet')}
            description={
              debouncedSearch
                ? tp('nobodyMatchedDesc')
                : tp('noPeopleYetDesc')
            }
            action={
              debouncedSearch ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearch('')}
                >
                  {tp('clearSearch')}
                </Button>
              ) : (
                <Button
                  iconLeft="user-plus"
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                >
                  {tp('addAPerson')}
                </Button>
              )
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tp('colName')}</TH>
                  <TH>{tp('colPrimaryContact')}</TH>
                  <TH>{tp('colDirectory')}</TH>
                  <TH>{tp('colAdded')}</TH>
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
            title: tp('personAdded'),
            message: tp('personAddedMessage', { name: person.displayName }),
          });
          setCreateOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function PersonRow({ person }: { person: Person }): React.ReactElement {
  const tp = useTranslations('AdminPeople');
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
          <span className="text-xs text-muted-foreground">{tp('noContact')}</span>
        )}
      </TD>
      <TD>
        {person.directoryOptIn ? (
          <StatusPill tone="success" hideDot>
            {tp('optedIn')}
          </StatusPill>
        ) : (
          <span className="text-xs text-muted-foreground">{tp('private')}</span>
        )}
      </TD>
      <TD className="text-sm text-muted-foreground">
        {formatDate(person.createdAt)}
      </TD>
      <TD className="text-right">
        <Link
          href={`/admin/people/${person.id}`}
          aria-label={tp('openPersonAria', { name: person.displayName })}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-ring"
        >
          <Icon name="chevron-right" size={16} />
        </Link>
      </TD>
    </TR>
  );
}
