'use client';

import Link from 'next/link';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
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

const KIND_TAB_VALUES = [
  'all',
  'ministry',
  'department',
  'team',
  'branch',
  'life_group',
] as const;

function canHaveParticipations(kind: string): boolean {
  return kind === 'ministry' || kind === 'life_group';
}

export function MinistriesClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const to = useTranslations('AdminOrganisation');
  const tc = useTranslations('Common');
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

  const tabLabel = (value: string): string => {
    switch (value) {
      case 'all':
        return to('tabAll');
      case 'ministry':
        return to('tabMinistries');
      case 'department':
        return to('tabDepartments');
      case 'team':
        return to('tabTeams');
      case 'branch':
        return to('tabBranches');
      case 'life_group':
        return to('tabLifeGroups');
      default:
        return value;
    }
  };

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
            : to('unableLoadMinistries'),
      );
    } finally {
      setLoading(false);
    }
  }, [kind, to]);

  useLoadEffect(load);

  // Collapse the expanded row when switching unit kind (during render, not
  // in an effect).
  const [prevKind, setPrevKind] = useState(kind);
  if (kind !== prevKind) {
    setPrevKind(kind);
    setExpandedId(null);
  }

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
            : to('unableLoadParticipations'),
      );
    } finally {
      setPartsLoading(false);
    }
  }, [to]);

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
        title: to('participationEnded'),
        message: to('participationEndedBody'),
      });
    } catch (err) {
      push({
        tone: 'danger',
        title: to('couldNotEndParticipation'),
        message: err instanceof ApiError ? err.message : tc('pleaseTryAgain'),
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
        title={t('ministries')}
        lede={t('ministriesLede')}
        actions={
          <Button iconLeft="plus" onClick={() => setCreateOpen(true)}>
            {to('newUnit')}
          </Button>
        }
      />

      <Tabs value={kind} onValueChange={setKind}>
        <TabList>
          {KIND_TAB_VALUES.map((value) => (
            <Tab key={value} value={value}>
              {tabLabel(value)}
              {kind !== 'all' || value === 'all' ? (
                <span className="ml-1 text-xs text-muted-foreground">
                  · {counts[value as keyof typeof counts] ?? 0}
                </span>
              ) : null}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={
          kind === 'all'
            ? to('allUnits')
            : to('kindPanelTitle', { kind: titleCase(kind) })
        }
        subtitle={
          error ? to('couldNotLoadUnits') : tc('totalCount', { count: units.length })
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
        ) : loading && units.length === 0 ? (
          <div className="px-5 py-6">
            <Skeleton size="block" />
            <Skeleton size="block" className="mt-3" />
          </div>
        ) : units.length === 0 ? (
          <EmptyState
            icon="hand"
            tone="lavender"
            title={to('noMinistriesYet')}
            description={to('noMinistriesBody')}
            action={
              <Button
                iconLeft="plus"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                {to('newUnit')}
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{to('nameLabel')}</TH>
                  <TH>{to('kindLabel')}</TH>
                  <TH>{to('statusLabel')}</TH>
                  <TH>{to('parentLabel')}</TH>
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
                            <Link
                              href={`/admin/organisation/${u.id}`}
                              className="font-medium text-foreground underline-offset-2 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {u.name}
                            </Link>
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
                          {parent ? parent.name : to('emDash')}
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
            title: to('unitCreatedTitle'),
            message: to('unitCreatedBody', { name: unit.name }),
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
              title: to('participationAdded'),
              message: to('participationAddedBody'),
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
  const to = useTranslations('AdminOrganisation');
  const tc = useTranslations('Common');
  const allowAdd = canHaveParticipations(unit.kind);

  return (
    <div className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {to('participations')}
          </p>
          <p className="text-xs text-muted-foreground">
            {allowAdd
              ? to('participationsHint')
              : to('participationsKindHint')}
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
            {to('add')}
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="py-4 text-center text-sm text-[color:var(--danger-ink)]">
          {error}
          <div className="mt-2">
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {tc('retry')}
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
            ? to('noParticipationsYet')
            : to('noParticipationsForKind')}
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
                    {to('fromDate', { date: formatDate(row.effectiveFrom) })}
                    {row.effectiveTo
                      ? ` · ${to('toDate', { date: formatDate(row.effectiveTo) })}`
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
                      {to('end')}
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
