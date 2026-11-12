'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Button,
  EmptyState,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  PageHeader,
  Panel,
  Skeleton,
  StatusPill,
  Tab,
  Tabs,
  TabList,
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
import type { ListEnvelope, Membership, Person } from '../../_lib/api-types';
import { formatDate, titleCase } from '../../_lib/format';
import { CreateMembershipDialog } from './create-membership-dialog';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'visitor', label: 'Visitors' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

/** Matches `MEMBERSHIP_STATUSES` in modules/membership. */
const STATUS_CHOICES = [
  'visitor',
  'active',
  'inactive',
] as const satisfies readonly string[];

/**
 * Memberships list.
 *
 * Shows every membership record in the active church, filterable by status.
 * Status changes call `POST /api/v1/memberships/:id/status`.
 */
export function MembershipsClient(): React.ReactElement {
  const { push } = useToast();
  const [status, setStatus] = useState<string>('all');
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('limit', '100');
    if (status !== 'all') params.set('status', status);
    try {
      const envelope = await apiFetch<ListEnvelope<Membership>>(
        `/api/v1/memberships?${params.toString()}`,
      );
      setMemberships([...envelope.data]);
      // Best-effort resolve person names for display.
      const peopleMap: Record<string, Person> = {};
      await Promise.all(
        envelope.data.map(async (m) => {
          if (peopleMap[m.personId]) return;
          try {
            const p = await apiFetch<Person>(`/api/v1/people/${m.personId}`);
            peopleMap[m.personId] = p;
          } catch {
            /* ignore */
          }
        }),
      );
      setPeople(peopleMap);
    } catch (err) {
      setMemberships([]);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load memberships',
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: memberships.length };
    for (const choice of STATUS_CHOICES) {
      out[choice] = memberships.filter((m) => m.status === choice).length;
    }
    return out;
  }, [memberships]);

  const handleStatusChange = async (
    membership: Membership,
    nextStatus: string,
  ): Promise<void> => {
    try {
      const updated = await apiFetch<Membership>(
        `/api/v1/memberships/${membership.id}/status`,
        {
          method: 'POST',
          json: { status: nextStatus },
        },
      );
      setMemberships((current) =>
        current.map((m) => (m.id === updated.id ? updated : m)),
      );
      push({
        tone: 'success',
        title: 'Status updated',
        message: `Now ${titleCase(nextStatus)}.`,
      });
    } catch (err) {
      push({
        tone: 'danger',
        title: 'Could not update status',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Memberships"
        lede="A snapshot of the people you serve — visitors becoming active members, and anyone paused."
        actions={
          <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
            Add membership
          </Button>
        }
      />

      <Tabs value={status} onValueChange={setStatus}>
        <TabList>
          {STATUS_FILTERS.map((f) => (
            <Tab key={f.value} value={f.value}>
              {f.label}
              <span className="ml-1 text-xs text-muted-foreground">
                {status === 'all' && f.value !== 'all'
                  ? ''
                  : f.value === 'all'
                    ? ''
                    : counts[f.value] !== undefined
                      ? `· ${counts[f.value]}`
                      : ''}
              </span>
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={
          status === 'all' ? 'All memberships' : `${titleCase(status)}s`
        }
        subtitle={
          error
            ? 'We couldn\'t load memberships.'
            : `${memberships.length} record${memberships.length === 1 ? '' : 's'}.`
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
        ) : loading && memberships.length === 0 ? (
          <div className="px-5 py-6">
            <Skeleton size="block" />
            <Skeleton size="block" className="mt-3" />
          </div>
        ) : memberships.length === 0 ? (
          <EmptyState
            icon="user-plus"
            tone="sky"
            title={
              status === 'all'
                ? 'No memberships yet'
                : `No ${titleCase(status).toLowerCase()}s yet`
            }
            description={
              status === 'all'
                ? 'Memberships appear when a person starts their journey with your church.'
                : 'Switch tabs to see other statuses, or update a visitor to make them a member.'
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Person</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH>Since</TH>
                  <TH>Ended</TH>
                  <TH className="w-12" />
                </TR>
              </THead>
              <TBody>
                {memberships.map((m) => {
                  const p = people[m.personId];
                  return (
                    <TR key={m.id}>
                      <TD>
                        {p ? (
                          <Link
                            href={`/admin/people/${p.id}`}
                            className="font-medium text-foreground hover:text-[color:var(--brand-gold-ink)] focus-ring rounded-sm"
                          >
                            {p.displayName}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Unknown person
                          </span>
                        )}
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {titleCase(m.membershipType)}
                      </TD>
                      <TD>
                        <StatusPill tone={statusTone(m.status)}>
                          {titleCase(m.status)}
                        </StatusPill>
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {formatDate(m.effectiveFrom)}
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {m.effectiveTo ? formatDate(m.effectiveTo) : '—'}
                      </TD>
                      <TD className="text-right">
                        <Menu
                          align="end"
                          label="Change status"
                          trigger={
                            <button
                              type="button"
                              aria-label="Change status"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-ring"
                            >
                              <Icon name="more-horizontal" size={16} />
                            </button>
                          }
                        >
                          <MenuLabel>Set status</MenuLabel>
                          {STATUS_CHOICES.map((choice) => (
                            <MenuItem
                              key={choice}
                              icon={choice === m.status ? 'check' : undefined}
                              onClick={() => {
                                if (choice === m.status) return;
                                void handleStatusChange(m, choice);
                              }}
                              disabled={choice === m.status}
                            >
                              {titleCase(choice)}
                            </MenuItem>
                          ))}
                          {p ? (
                            <>
                              <MenuSeparator />
                              <MenuItem
                                icon="user"
                                onClick={() => {
                                  window.location.href = `/admin/people/${p.id}`;
                                }}
                              >
                                Open profile
                              </MenuItem>
                            </>
                          ) : null}
                        </Menu>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <CreateMembershipDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          setMemberships((current) => [created, ...current]);
          void load();
          push({
            tone: 'success',
            title: 'Membership created',
            message: `Started as ${titleCase(created.status)}.`,
          });
        }}
      />
    </div>
  );
}

function statusTone(
  status: string,
): 'neutral' | 'success' | 'warning' | 'info' | 'pending' {
  switch (status) {
    case 'active':
      return 'success';
    case 'visitor':
      return 'info';
    case 'inactive':
      return 'neutral';
    default:
      return 'pending';
  }
}
