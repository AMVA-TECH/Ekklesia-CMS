'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch } from '@/app/_ekklesia/session';
import {
  Avatar,
  Badge,
  Card,
  CardSubtitle,
  CardTitle,
  EmptyState,
  PageHeader,
  Panel,
  SearchField,
  Skeleton,
  StatusPill,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type {
  MemberDirectoryEntry,
  MemberParticipationRequest,
} from '../_shared/api-types';

export function CommunityClient(): React.ReactElement {
  const [participations, setParticipations] = useState<
    MemberParticipationRequest[] | null
  >(null);
  const [directory, setDirectory] = useState<MemberDirectoryEntry[] | null>(null);
  const [participationError, setParticipationError] = useState<string | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [pResult, dResult] = await Promise.allSettled([
        apiFetch<MemberParticipationRequest[]>(
          '/api/v1/participation-requests/me?limit=50',
        ),
        apiFetch<MemberDirectoryEntry[]>('/api/v1/directory?limit=50'),
      ]);
      if (cancelled) return;
      if (pResult.status === 'fulfilled') setParticipations(pResult.value);
      else setParticipationError(messageFor(pResult.reason));
      if (dResult.status === 'fulfilled') setDirectory(dResult.value);
      else setDirectoryError(messageFor(dResult.reason));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const approved = useMemo(
    () => (participations ?? []).filter((p) => p.status === 'approved'),
    [participations],
  );
  const pending = useMemo(
    () => (participations ?? []).filter((p) => p.status === 'pending'),
    [participations],
  );

  const filteredDirectory = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = directory ?? [];
    if (!q) return list;
    return list.filter(
      (entry) =>
        entry.displayName.toLowerCase().includes(q) ||
        entry.ministries.some((m) => m.name.toLowerCase().includes(q)),
    );
  }, [directory, search]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Community"
        lede="Your ministries, groups, and the people you walk with."
      />

      <Tabs defaultValue="mine">
        <TabList aria-label="Community view">
          <Tab value="mine">My ministries</Tab>
          <Tab value="directory">Directory</Tab>
        </TabList>

        <TabPanel value="mine" className="mt-4 flex flex-col gap-5">
          <Panel
            title="Where you serve"
            subtitle="Groups and ministries you belong to."
          >
            {loading ? (
              <RowSkeleton count={2} />
            ) : participationError ? (
              <ErrorRow message={participationError} />
            ) : approved.length === 0 ? (
              <EmptyState
                icon="users"
                tone="sage"
                title="You haven’t joined a ministry yet"
                description="Ministries are small teams where you can serve, grow, and build friendships. Ask your pastor or ministry leader about joining one."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {approved.map((p) => (
                  <MinistryRow
                    key={p.id}
                    label={`Ministry · ${shortId(p.organisationalUnitId)}`}
                    status="Active"
                  />
                ))}
              </ul>
            )}
          </Panel>

          {pending.length > 0 ? (
            <Panel
              title="Pending requests"
              subtitle="We’ll let you know when your ministry leader responds."
            >
              <ul className="flex flex-col gap-2">
                {pending.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span
                        aria-hidden="true"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md tone-sage"
                      >
                        <Icon name="users" size={16} />
                      </span>
                      <span>Ministry · {shortId(p.organisationalUnitId)}</span>
                    </span>
                    <StatusPill tone="pending">Awaiting approval</StatusPill>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Card padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span
              aria-hidden="true"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md tone-sage"
            >
              <Icon name="hand" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <CardTitle>Want to join a new ministry?</CardTitle>
              <CardSubtitle>
                Talk to your ministry leader or your pastor — they can add you to the team.
              </CardSubtitle>
            </div>
          </Card>
        </TabPanel>

        <TabPanel value="directory" className="mt-4 flex flex-col gap-4">
          <SearchField
            label="Search the directory"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Name or ministry"
          />

          {loading ? (
            <RowSkeleton count={4} />
          ) : directoryError ? (
            <ErrorRow message={directoryError} />
          ) : filteredDirectory.length === 0 ? (
            <EmptyState
              icon="users"
              tone="sage"
              title={
                (directory?.length ?? 0) === 0
                  ? 'The directory is empty for now'
                  : 'No one matches that search'
              }
              description={
                (directory?.length ?? 0) === 0
                  ? 'As more members opt in, you’ll see them here. You can opt in on your profile.'
                  : 'Try a different name or ministry.'
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {filteredDirectory.map((entry) => (
                <li
                  key={entry.personId}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-3"
                >
                  <Avatar name={entry.displayName} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {entry.displayName}
                    </p>
                    {entry.ministries.length > 0 ? (
                      <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        {entry.ministries.slice(0, 2).map((m, i) => (
                          <span key={m.organisationalUnitId}>
                            {i > 0 ? ' · ' : null}
                            {m.name}
                            {m.roleInUnit ? ` (${m.roleInUnit})` : null}
                          </span>
                        ))}
                        {entry.ministries.length > 2 ? (
                          <Badge tone="neutral">+{entry.ministries.length - 2}</Badge>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}

function MinistryRow({
  label,
  status,
}: {
  label: string;
  status: string;
}): React.ReactElement {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md tone-sage"
        >
          <Icon name="users" size={16} />
        </span>
        <span>{label}</span>
      </span>
      <StatusPill tone="success">{status}</StatusPill>
    </li>
  );
}

function RowSkeleton({ count }: { count: number }): React.ReactElement {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} size="block" className="h-12 w-full" radius="md" />
      ))}
    </div>
  );
}

function ErrorRow({ message }: { message: string }): React.ReactElement {
  return (
    <div className="flex items-start gap-2 rounded-md border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--danger-ink)]">
      <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function messageFor(reason: unknown): string {
  if (reason instanceof ApiError) {
    return reason.message || 'We could not load this list.';
  }
  if (reason instanceof Error) return reason.message;
  return 'Something went wrong.';
}

function shortId(id: string): string {
  return id.slice(0, 8);
}
