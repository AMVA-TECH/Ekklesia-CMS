'use client';

import { useTranslations } from 'next-intl';

import Link from 'next/link';
import {
  useCallback,
  useId,
  useState,
  type FormEvent,
} from 'react';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  buttonClassName,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  Skeleton,
  StatusPill,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
  useToast,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type {
  LeadershipPosition,
  OrganisationalUnit,
  Participation,
  Person,
} from '../../../_lib/api-types';
import { formatDate, titleCase } from '../../../_lib/format';
import { asList } from '../../../_lib/list';

interface ProgrammeRow {
  id: string;
  ministryUnitId: string;
  name: string;
  status: string;
}

interface UnitDetailClientProps {
  unitId: string;
}

export function UnitDetailClient({
  unitId,
}: UnitDetailClientProps): React.ReactElement {
  const to = useTranslations('AdminOrganisation');
  const tc = useTranslations('Common');
  const { push } = useToast();
  const editFormId = useId();
  const [unit, setUnit] = useState<OrganisationalUnit | null>(null);
  const [allUnits, setAllUnits] = useState<OrganisationalUnit[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [programmes, setProgrammes] = useState<ProgrammeRow[]>([]);
  const [positions, setPositions] = useState<LeadershipPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [parentId, setParentId] = useState('');

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [detail, unitsPayload, positionsPayload] = await Promise.all([
        apiFetch<OrganisationalUnit>(`/api/v1/organisational-units/${unitId}`),
        apiFetch<OrganisationalUnit[] | { data: OrganisationalUnit[] }>(
          '/api/v1/organisational-units?limit=200',
        ),
        apiFetch<LeadershipPosition[] | { data: LeadershipPosition[] }>(
          '/api/v1/positions?limit=200',
        ).catch(() => ({ data: [] as LeadershipPosition[] })),
      ]);
      setUnit(detail);
      setName(detail.name);
      setDescription(detail.description ?? '');
      setStatus(detail.status);
      setParentId(detail.parentId ?? '');
      setAllUnits(asList(unitsPayload));
      setPositions(
        asList(positionsPayload).filter(
          (p) => p.organisationalUnitId === unitId,
        ),
      );

      const parts = await apiFetch<Participation[] | { data: Participation[] }>(
        `/api/v1/organisational-units/${unitId}/participations`,
      ).catch(() => ({ data: [] as Participation[] }));
      const partRows = asList(parts);
      setParticipations(partRows);
      const peopleMap: Record<string, Person> = {};
      await Promise.all(
        partRows.map(async (row) => {
          if (peopleMap[row.personId]) return;
          try {
            peopleMap[row.personId] = await apiFetch<Person>(
              `/api/v1/people/${row.personId}`,
            );
          } catch {
            /* ignore */
          }
        }),
      );
      setPeople(peopleMap);

      if (detail.kind === 'ministry') {
        const progPayload = await apiFetch<
          ProgrammeRow[] | { data: ProgrammeRow[] }
        >(`/api/v1/organisational-units/${unitId}/programmes`).catch(() => ({
          data: [] as ProgrammeRow[],
        }));
        setProgrammes(asList(progPayload));
      } else {
        setProgrammes([]);
      }
    } catch (err) {
      setUnit(null);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : to('unableLoadUnit'),
      );
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useLoadEffect(load);

  const handleSave = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (saving || !unit) return;
    setSaving(true);
    try {
      const updated = await apiFetch<OrganisationalUnit>(
        `/api/v1/organisational-units/${unit.id}`,
        {
          method: 'PATCH',
          json: {
            name: name.trim(),
            description: description.trim() || null,
            status,
            parentId: parentId || null,
          },
        },
      );
      setUnit(updated);
      setEditing(false);
      push({ tone: 'success', message: to('unitProfileSaved') });
      void load();
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError
            ? err.message
            : to('couldNotSaveUnit'),
      });
    } finally {
      setSaving(false);
    }
  };

  const parent = unit?.parentId
    ? allUnits.find((u) => u.id === unit.parentId)
    : null;
  const children = allUnits.filter((u) => u.parentId === unitId);
  const parentOptions = allUnits.filter((u) => u.id !== unitId);

  if (loading && !unit) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton size="heading" className="w-64" />
        <Skeleton size="block" />
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={
            <Link
              href="/admin/organisation"
              className="inline-flex items-center gap-1 text-foreground hover:text-[color:var(--brand-gold-ink)]"
            >
              <Icon name="arrow-left" size={14} />
              {to('backToOrganisation')}
            </Link>
          }
          title={to('unitNotFound')}
          lede={error ?? to('unitNotFoundBody')}
          actions={
            <Link
              href="/admin/organisation"
              className={buttonClassName({ variant: 'secondary' })}
            >
              {to('backToList')}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link
            href="/admin/organisation"
            className="inline-flex items-center gap-1 text-foreground hover:text-[color:var(--brand-gold-ink)]"
          >
            <Icon name="arrow-left" size={14} />
            {to('backToOrganisation')}
          </Link>
        }
        title={unit.name}
        lede={
          unit.description?.trim() ||
          `${titleCase(unit.kind)} · ${unit.code}`
        }
        actions={
          <>
            {editing ? (
              <>
                <Button
                  variant="secondary"
                  disabled={saving}
                  onClick={() => {
                    setEditing(false);
                    setName(unit.name);
                    setDescription(unit.description ?? '');
                    setStatus(unit.status);
                    setParentId(unit.parentId ?? '');
                  }}
                >
                  {tc('cancel')}
                </Button>
                <Button
                  type="submit"
                  form={editFormId}
                  loading={saving}
                >
                  {to('saveChanges')}
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                iconLeft="edit"
                onClick={() => setEditing(true)}
              >
                {tc('edit')}
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge>{unit.code}</Badge>
        <Badge>{titleCase(unit.kind)}</Badge>
        <StatusPill tone={unit.status === 'active' ? 'success' : 'neutral'}>
          {titleCase(unit.status)}
        </StatusPill>
        {unit.metadata?.proposed === true ? <Badge>{to('proposed')}</Badge> : null}
      </div>

      {editing ? (
        <Panel title={to('editUnit')}>
          <form
            id={editFormId}
            onSubmit={(e) => {
              void handleSave(e);
            }}
            className="grid max-w-2xl gap-4 p-4 sm:p-5"
          >
            <Field label={to('nameLabel')} required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                required
              />
            </Field>
            <Field label={to('descriptionLabel')}>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={4000}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={to('statusLabel')}>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">{tc('active')}</option>
                  <option value="inactive">{tc('inactive')}</option>
                </Select>
              </Field>
              <Field label={to('parentUnit')}>
                <Select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">{to('noneTopLevel')}</option>
                  {parentOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.kind})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </form>
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{to('overview')}</CardTitle>
            </CardHeader>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">{to('kindLabel')}</dt>
                <dd className="font-medium text-foreground">
                  {titleCase(unit.kind)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{to('codeLabel')}</dt>
                <dd className="font-medium text-foreground">{unit.code}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{to('statusLabel')}</dt>
                <dd>
                  <StatusPill
                    tone={unit.status === 'active' ? 'success' : 'neutral'}
                  >
                    {titleCase(unit.status)}
                  </StatusPill>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{to('parentLabel')}</dt>
                <dd className="font-medium text-foreground">
                  {parent ? (
                    <Link
                      href={`/admin/organisation/${parent.id}`}
                      className="text-foreground underline-offset-2 hover:underline"
                    >
                      {parent.name}
                    </Link>
                  ) : (
                    to('emDash')
                  )}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{to('descriptionLabel')}</CardTitle>
            </CardHeader>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {unit.description?.trim() ||
                to('noDescriptionYet')}
            </p>
          </Card>
        </div>
      )}

      {children.length > 0 ? (
        <Panel title={to('childUnits')} subtitle={to('nestedCount', { count: children.length })}>
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{to('nameLabel')}</TH>
                  <TH>{to('kindLabel')}</TH>
                  <TH>{to('codeLabel')}</TH>
                  <TH>{to('statusLabel')}</TH>
                </TR>
              </THead>
              <TBody>
                {children.map((child) => (
                  <TR key={child.id}>
                    <TD>
                      <Link
                        href={`/admin/organisation/${child.id}`}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {child.name}
                      </Link>
                    </TD>
                    <TD>
                      <Badge>{titleCase(child.kind)}</Badge>
                    </TD>
                    <TD>
                      <Badge>{child.code}</Badge>
                    </TD>
                    <TD>
                      <StatusPill
                        tone={
                          child.status === 'active' ? 'success' : 'neutral'
                        }
                      >
                        {titleCase(child.status)}
                      </StatusPill>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Panel>
      ) : null}

      {unit.kind === 'ministry' ? (
        <Panel
          title={to('programmes')}
          subtitle={
            programmes.length === 0
              ? to('noneYet')
              : to('programmesCount', { count: programmes.length })
          }
        >
          {programmes.length === 0 ? (
            <EmptyState
              icon="calendar"
              tone="gold"
              title={to('noProgrammes')}
              description={to('noProgrammesBody')}
            />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR noHover>
                    <TH>{to('nameLabel')}</TH>
                    <TH>{to('statusLabel')}</TH>
                  </TR>
                </THead>
                <TBody>
                  {programmes.map((p) => (
                    <TR key={p.id}>
                      <TD className="font-medium text-foreground">{p.name}</TD>
                      <TD>
                        <StatusPill
                          tone={
                            p.status === 'active' ? 'success' : 'neutral'
                          }
                        >
                          {titleCase(p.status)}
                        </StatusPill>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Panel>
      ) : null}

      <Panel
        title={to('linkedPositions')}
        subtitle={
          positions.length === 0
            ? to('noneLinked')
            : to('positionsCount', { count: positions.length })
        }
      >
        {positions.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {to('noLinkedPositions')}
          </p>
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{to('titleLabel')}</TH>
                  <TH>{to('codeLabel')}</TH>
                  <TH>{to('statusLabel')}</TH>
                </TR>
              </THead>
              <TBody>
                {positions.map((p) => (
                  <TR key={p.id}>
                    <TD>
                      <Link
                        href={`/admin/leadership/${p.id}`}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {p.title}
                      </Link>
                    </TD>
                    <TD>
                      <Badge>{p.code}</Badge>
                    </TD>
                    <TD>
                      <StatusPill
                        tone={p.status === 'active' ? 'success' : 'neutral'}
                      >
                        {titleCase(p.status)}
                      </StatusPill>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <Panel
        title={to('people')}
        subtitle={to('activeCount', { count: participations.filter((p) => p.status === 'active').length })}
      >
        {participations.length === 0 ? (
          <EmptyState
            icon="users"
            tone="gold"
            title={to('noParticipations')}
            description={to('noParticipationsBody')}
            action={
              <Link
                href="/admin/ministries"
                className={buttonClassName({ variant: 'secondary', size: 'sm' })}
              >
                {to('openMinistries')}
              </Link>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tc('person')}</TH>
                  <TH>{to('roleInUnit')}</TH>
                  <TH>{to('from')}</TH>
                  <TH>{to('statusLabel')}</TH>
                </TR>
              </THead>
              <TBody>
                {participations.map((row) => {
                  const person = people[row.personId];
                  return (
                    <TR key={row.id}>
                      <TD>
                        {person ? (
                          <Link
                            href={`/admin/people/${person.id}`}
                            className="font-medium text-foreground underline-offset-2 hover:underline"
                          >
                            {person.displayName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">
                            {row.personId.slice(0, 8)}…
                          </span>
                        )}
                      </TD>
                      <TD className="text-muted-foreground">
                        {row.roleInUnit ?? to('emDash')}
                      </TD>
                      <TD className="text-muted-foreground">
                        {formatDate(row.effectiveFrom)}
                      </TD>
                      <TD>
                        <StatusPill
                          tone={
                            row.status === 'active' ? 'success' : 'neutral'
                          }
                        >
                          {titleCase(row.status)}
                        </StatusPill>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
