'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  EmptyState,
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
import type {
  OrganisationalUnit,
  Participation,
  Person,
} from '../../_lib/api-types';
import { formatDate, titleCase } from '../../_lib/format';
import { asList } from '../../_lib/list';
import { AddParticipationDialog } from './add-participation-dialog';
import { CreateUnitDialog } from './create-unit-dialog';

const KIND_TABS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'ministry', label: 'Ministries' },
  { value: 'department', label: 'Departments' },
  { value: 'life_group', label: 'Life groups' },
];

function canHaveParticipations(kind: string): boolean {
  return kind === 'ministry' || kind === 'life_group';
}

export function MinistriesClient(): React.ReactElement {
  const { push } = useToast();
  const [kind, setKind] = useState('all');
  const [units, setUnits] = useState<OrganisationalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsError, setPartsError] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('limit', '100');
    if (kind !== 'all') params.set('kind', kind);
    try {
      const payload = await apiFetch<
        OrganisationalUnit[] | { data: OrganisationalUnit[] }
      >(`/api/v1/organisational-units?${params.toString()}`);
      setUnits(asList(payload));
    } catch (err) {
      setUnits([]);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load ministries',
      );
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setExpandedId(null);
  }, [kind]);

  const loadParticipations = useCallback(async (unitId: string): Promise<void> => {
    setPartsLoading(true);
    setPartsError(null);
    try {
      const payload = await apiFetch<
        Participation[] | { data: Participation[] }
      >(`/api/v1/organisational-units/${unitId}/participations`);
      const rows = asList(payload);
      setParticipations(rows);
      const peopleMap: Record<string, Person> = {};
      await Promise.all(
        rows.map(async (row) => {
          if (peopleMap[row.personId]) return;
          try {
            const person = await apiFetch<Person>(
              `/api/v1/people/${row.personId}`,
            );
            peopleMap[row.personId] = person;
          } catch {
            /* ignore */
          }
        }),
      );
      setPeople(peopleMap);
    } catch (err) {
      setParticipations([]);
      setPeople({});
      setPartsError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load participations',
      );
    } finally {
      setPartsLoading(false);
    }
  }, []);

  const toggleExpand = (unitId: string): void => {
    if (expandedId === unitId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(unitId);
    void loadParticipations(unitId);
  };

  const handleEnd = async (participation: Participation): Promise<void> => {
    if (endingId) return;
    setEndingId(participation.id);
    try {
      const updated = await apiFetch<Participation>(
        `/api/v1/participations/${participation.id}/end`,
        {
          method: 'POST',
          json: {},
        },
      );
      setParticipations((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      );
      push({
        tone: 'success',
        title: 'Participation ended',
        message: 'This person is no longer active in the unit.',
      });
    } catch (err) {
      push({
        tone: 'danger',
        title: 'Could not end participation',
        message: err instanceof ApiError ? err.message : 'Please try again.',
      });
    } finally {
      setEndingId(null);
    }
  };

  const counts = useMemo(() => {
    return {
      all: units.length,
      ministry: units.filter((u) => u.kind === 'ministry').length,
      department: units.filter((u) => u.kind === 'department').length,
      life_group: units.filter((u) => u.kind === 'life_group').length,
    };
  }, [units]);

  const expandedUnit = expandedId
    ? units.find((u) => u.id === expandedId) ?? null
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ministries"
        lede="Teams, departments, and life groups that organise service in your church."
        actions={
          <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
            New unit
          </Button>
        }
      />

      <Tabs value={kind} onValueChange={setKind}>
        <TabList>
          {KIND_TABS.map((t) => (
            <Tab key={t.value} value={t.value}>
              {t.label}
              {kind !== 'all' || t.value === 'all' ? (
                <span className="ml-1 text-xs text-muted-foreground">
                  · {counts[t.value as keyof typeof counts] ?? 0}
                </span>
              ) : null}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={kind === 'all' ? 'All units' : titleCase(kind) + 's'}
        subtitle={
          error
            ? 'We couldn\'t load organisational units.'
            : `${units.length} total`
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
        ) : loading && units.length === 0 ? (
          <div className="px-5 py-6">
            <Skeleton size="block" />
            <Skeleton size="block" className="mt-3" />
          </div>
        ) : units.length === 0 ? (
          <EmptyState
            icon="hand"
            tone="lavender"
            title="No ministries yet"
            description="Create a ministry, department, or life group to start organising teams and events."
            action={
              <Button
                iconLeft="plus"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                New unit
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Name</TH>
                  <TH>Kind</TH>
                  <TH>Status</TH>
                  <TH>Parent</TH>
                </TR>
              </THead>
              <TBody>
                {units.map((u) => {
                  const parent = u.parentId
                    ? units.find((x) => x.id === u.parentId)
                    : null;
                  const open = expandedId === u.id;
                  return (
                    <Fragment key={u.id}>
                      <TR
                        onClick={() => toggleExpand(u.id)}
                        className="cursor-pointer"
                        aria-expanded={open}
                      >
                        <TD>
                          <span className="inline-flex items-center gap-2">
                            <Icon
                              name={open ? 'chevron-down' : 'chevron-right'}
                              size={14}
                            />
                            <span
                              aria-hidden="true"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md tone-lavender"
                            >
                              <Icon name="hand" size={16} />
                            </span>
                            <span className="font-medium text-foreground">
                              {u.name}
                            </span>
                          </span>
                        </TD>
                        <TD>
                          <Badge tone="neutral">{titleCase(u.kind)}</Badge>
                        </TD>
                        <TD>
                          <StatusPill
                            tone={u.status === 'active' ? 'success' : 'neutral'}
                          >
                            {titleCase(u.status)}
                          </StatusPill>
                        </TD>
                        <TD className="text-sm text-muted-foreground">
                          {parent ? parent.name : '—'}
                        </TD>
                      </TR>
                      {open ? (
                        <TR noHover>
                          <TD colSpan={4} className="bg-surface-muted/40 p-0">
                            <UnitParticipationsPanel
                              unit={u}
                              loading={partsLoading}
                              error={partsError}
                              participations={participations}
                              people={people}
                              endingId={endingId}
                              onRetry={() => void loadParticipations(u.id)}
                              onAdd={() => setAddOpen(true)}
                              onEnd={(row) => {
                                void handleEnd(row);
                              }}
                            />
                          </TD>
                        </TR>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <CreateUnitDialog
        open={createOpen}
        parents={units}
        onClose={() => setCreateOpen(false)}
        onCreated={(unit) => {
          push({
            tone: 'success',
            title: 'Unit created',
            message: `${unit.name} is live.`,
          });
          setCreateOpen(false);
          void load();
        }}
      />

      {expandedUnit ? (
        <AddParticipationDialog
          open={addOpen}
          unitId={expandedUnit.id}
          unitName={expandedUnit.name}
          onClose={() => setAddOpen(false)}
          onCreated={(created) => {
            push({
              tone: 'success',
              title: 'Participation added',
              message: 'Person linked to this unit.',
            });
            setAddOpen(false);
            setParticipations((current) => [created, ...current]);
            void (async () => {
              try {
                const person = await apiFetch<Person>(
                  `/api/v1/people/${created.personId}`,
                );
                setPeople((current) => ({
                  ...current,
                  [created.personId]: person,
                }));
              } catch {
                /* ignore */
              }
            })();
          }}
        />
      ) : null}
    </div>
  );
}

interface UnitParticipationsPanelProps {
  unit: OrganisationalUnit;
  loading: boolean;
  error: string | null;
  participations: readonly Participation[];
  people: Record<string, Person>;
  endingId: string | null;
  onRetry: () => void;
  onAdd: () => void;
  onEnd: (participation: Participation) => void;
}

function UnitParticipationsPanel({
  unit,
  loading,
  error,
  participations,
  people,
  endingId,
  onRetry,
  onAdd,
  onEnd,
}: UnitParticipationsPanelProps): React.ReactElement {
  const allowAdd = canHaveParticipations(unit.kind);

  return (
    <div className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Participations</p>
          <p className="text-xs text-muted-foreground">
            {allowAdd
              ? 'People currently or previously serving in this unit.'
              : 'Participations apply to ministries and life groups only.'}
          </p>
        </div>
        {allowAdd ? (
          <Button
            size="sm"
            iconLeft="plus"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
          >
            Add
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="py-4 text-center text-sm text-[color:var(--danger-ink)]">
          {error}
          <div className="mt-2">
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        </div>
      ) : loading ? (
        <div className="py-2">
          <Skeleton size="block" />
        </div>
      ) : participations.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          {allowAdd
            ? 'No participations yet. Add someone to get started.'
            : 'No participations for this unit kind.'}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-background">
          {participations.map((row) => {
            const person = people[row.personId];
            const active = row.status === 'active';
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {person?.displayName ?? row.personId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.roleInUnit ? `${row.roleInUnit} · ` : null}
                    From {formatDate(row.effectiveFrom)}
                    {row.effectiveTo
                      ? ` · to ${formatDate(row.effectiveTo)}`
                      : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone={active ? 'success' : 'neutral'}>
                    {titleCase(row.status)}
                  </StatusPill>
                  {active && allowAdd ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={endingId === row.id}
                      disabled={endingId !== null}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEnd(row);
                      }}
                    >
                      End
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
