'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Button,
  buttonClassName,
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
import { formatDate } from '../../_lib/format';
import { CreateMembershipDialog } from './create-membership-dialog';

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
  const t = useTranslations('AdminPages');
  const tm = useTranslations('AdminMemberships');
  const tc = useTranslations('Common');
  const router = useRouter();
  const { push } = useToast();
  const [status, setStatus] = useState<string>('all');
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const statusLabel = (value: string): string => {
    switch (value) {
      case 'visitor':
        return tm('statusVisitor');
      case 'active':
        return tm('statusActive');
      case 'inactive':
        return tm('statusInactive');
      default:
        return value;
    }
  };

  const statusFilters = [
    { value: 'all', label: tm('filterAll') },
    { value: 'visitor', label: tm('filterVisitors') },
    { value: 'active', label: tm('filterActive') },
    { value: 'inactive', label: tm('filterInactive') },
  ];

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
            : tm('unableLoad'),
      );
    } finally {
      setLoading(false);
    }
  }, [status, tm]);

  useLoadEffect(load);

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
        title: tm('statusUpdated'),
        message: tm('statusUpdatedMessage', { status: statusLabel(nextStatus) }),
      });
    } catch (err) {
      push({
        tone: 'danger',
        title: tm('couldNotUpdateStatus'),
        message: err instanceof ApiError ? err.message : tm('pleaseTryAgain'),
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('memberships')}
        lede={t('membershipsLede')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/memberships/applications"
              className={buttonClassName({ variant: 'secondary' })}
            >
              {tm('applications')}
            </Link>
            <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
              {tm('addMembership')}
            </Button>
          </div>
        }
      />

      <Tabs value={status} onValueChange={setStatus}>
        <TabList>
          {statusFilters.map((f) => (
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
          status === 'all'
            ? tm('allMemberships')
            : tm('filteredMemberships', { status: statusLabel(status) })
        }
        subtitle={
          error
            ? tm('loadErrorSubtitle')
            : tm('recordsCount', { count: memberships.length })
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
                ? tm('noMembershipsYet')
                : tm('noStatusYet', { status: statusLabel(status).toLowerCase() })
            }
            description={
              status === 'all'
                ? tm('noMembershipsDesc')
                : tm('noStatusDesc')
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tm('colPerson')}</TH>
                  <TH>{tm('colType')}</TH>
                  <TH>{tm('colStatus')}</TH>
                  <TH>{tm('colSince')}</TH>
                  <TH>{tm('colEnded')}</TH>
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
                            {tm('unknownPerson')}
                          </span>
                        )}
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {typeLabel(m.membershipType, tm)}
                      </TD>
                      <TD>
                        <StatusPill tone={statusTone(m.status)}>
                          {statusLabel(m.status)}
                        </StatusPill>
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {formatDate(m.effectiveFrom)}
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {m.effectiveTo ? formatDate(m.effectiveTo) : tm('dash')}
                      </TD>
                      <TD className="text-right">
                        <Menu
                          align="end"
                          label={tm('changeStatus')}
                          trigger={
                            <button
                              type="button"
                              aria-label={tm('changeStatus')}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-ring"
                            >
                              <Icon name="more-horizontal" size={16} />
                            </button>
                          }
                        >
                          <MenuLabel>{tm('setStatus')}</MenuLabel>
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
                              {statusLabel(choice)}
                            </MenuItem>
                          ))}
                          {p ? (
                            <>
                              <MenuSeparator />
                              <MenuItem
                                icon="user"
                                onClick={() => {
                                  router.push(`/admin/people/${p.id}`);
                                }}
                              >
                                {tm('openProfile')}
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
            title: tm('membershipCreated'),
            message: tm('membershipCreatedMessage', {
              status: statusLabel(created.status),
            }),
          });
        }}
      />
    </div>
  );
}

function typeLabel(
  value: string,
  tm: ReturnType<typeof useTranslations<'AdminMemberships'>>,
): string {
  switch (value) {
    case 'individual':
      return tm('typeIndividual');
    case 'household':
      return tm('typeHousehold');
    case 'family':
      return tm('typeFamily');
    default:
      return value;
  }
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
