'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
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
  LeadershipAppointment,
  LeadershipPosition,
  OrganisationalUnit,
  Person,
} from '../../../_lib/api-types';
import { formatDate, titleCase } from '../../../_lib/format';
import { asList } from '../../../_lib/list';
import { AppointLeaderDialog } from './appoint-leader-dialog';

interface PositionDetailClientProps {
  positionId: string;
}

export function PositionDetailClient({
  positionId,
}: PositionDetailClientProps): React.ReactElement {
  const { push } = useToast();
  const editFormId = useId();
  const [position, setPosition] = useState<LeadershipPosition | null>(null);
  const [allPositions, setAllPositions] = useState<LeadershipPosition[]>([]);
  const [units, setUnits] = useState<OrganisationalUnit[]>([]);
  const [appointments, setAppointments] = useState<LeadershipAppointment[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appointOpen, setAppointOpen] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [occupancyPolicy, setOccupancyPolicy] = useState('single');
  const [reportsTo, setReportsTo] = useState('');
  const [unitId, setUnitId] = useState('');

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [detail, positionsPayload, unitsPayload, apptsPayload] =
        await Promise.all([
          apiFetch<LeadershipPosition>(`/api/v1/positions/${positionId}`),
          apiFetch<LeadershipPosition[] | { data: LeadershipPosition[] }>(
            '/api/v1/positions?limit=200',
          ),
          apiFetch<OrganisationalUnit[] | { data: OrganisationalUnit[] }>(
            '/api/v1/organisational-units?limit=200',
          ).catch(() => ({ data: [] as OrganisationalUnit[] })),
          apiFetch<
            LeadershipAppointment[] | { data: LeadershipAppointment[] }
          >(`/api/v1/appointments?positionId=${positionId}&limit=100`).catch(
            () => ({ data: [] as LeadershipAppointment[] }),
          ),
        ]);

      setPosition(detail);
      setTitle(detail.title);
      setDescription(detail.description ?? '');
      setStatus(detail.status);
      setOccupancyPolicy(detail.occupancyPolicy);
      setReportsTo(detail.reportsToPositionId ?? '');
      setUnitId(detail.organisationalUnitId ?? '');
      setAllPositions(asList(positionsPayload));
      setUnits(asList(unitsPayload));
      const appts = asList(apptsPayload);
      setAppointments(appts);

      const peopleMap: Record<string, Person> = {};
      await Promise.all(
        appts.map(async (row) => {
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
    } catch (err) {
      setPosition(null);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load this position.',
      );
    } finally {
      setLoading(false);
    }
  }, [positionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const reportsToPosition = useMemo(
    () =>
      position?.reportsToPositionId
        ? allPositions.find((p) => p.id === position.reportsToPositionId)
        : null,
    [allPositions, position],
  );

  const directReports = useMemo(
    () => allPositions.filter((p) => p.reportsToPositionId === positionId),
    [allPositions, positionId],
  );

  const linkedUnit = useMemo(
    () =>
      position?.organisationalUnitId
        ? units.find((u) => u.id === position.organisationalUnitId)
        : null,
    [position, units],
  );

  const activeAppointments = appointments.filter((a) => a.status === 'active');

  const handleEndAppointment = async (
    appointmentId: string,
  ): Promise<void> => {
    if (endingId) return;
    setEndingId(appointmentId);
    try {
      await apiFetch(`/api/v1/appointments/${appointmentId}/end`, {
        method: 'POST',
        json: {},
      });
      push({
        tone: 'success',
        message: 'Appointment ended. The position may now be vacant.',
      });
      void load();
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError
            ? err.message
            : 'Could not end this appointment.',
      });
    } finally {
      setEndingId(null);
    }
  };

  const handleSave = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (saving || !position) return;
    setSaving(true);
    try {
      const updated = await apiFetch<LeadershipPosition>(
        `/api/v1/positions/${position.id}`,
        {
          method: 'PATCH',
          json: {
            title: title.trim(),
            description: description.trim() || null,
            status,
            occupancyPolicy,
            reportsToPositionId: reportsTo || null,
            organisationalUnitId: unitId || null,
          },
        },
      );
      setPosition(updated);
      setEditing(false);
      push({ tone: 'success', message: 'Position profile saved.' });
      void load();
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError
            ? err.message
            : 'Could not save position profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !position) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton size="heading" className="w-64" />
        <Skeleton size="block" />
      </div>
    );
  }

  if (!position) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={
            <Link
              href="/admin/leadership"
              className="inline-flex items-center gap-1 text-foreground hover:text-[color:var(--brand-gold-ink)]"
            >
              <Icon name="arrow-left" size={14} />
              Back to leadership
            </Link>
          }
          title="Position not found"
          lede={error ?? 'We could not find this leadership position.'}
          actions={
            <Link
              href="/admin/leadership"
              className={buttonClassName({ variant: 'secondary' })}
            >
              Back to list
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
            href="/admin/leadership"
            className="inline-flex items-center gap-1 text-foreground hover:text-[color:var(--brand-gold-ink)]"
          >
            <Icon name="arrow-left" size={14} />
            Back to leadership
          </Link>
        }
        title={position.title}
        lede={
          position.description?.trim() ||
          `${position.code} · appointments do not grant system access`
        }
        actions={
          editing ? (
            <>
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setTitle(position.title);
                  setDescription(position.description ?? '');
                  setStatus(position.status);
                  setOccupancyPolicy(position.occupancyPolicy);
                  setReportsTo(position.reportsToPositionId ?? '');
                  setUnitId(position.organisationalUnitId ?? '');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" form={editFormId} loading={saving}>
                Save changes
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                iconLeft="edit"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                iconLeft="user-plus"
                onClick={() => setAppointOpen(true)}
              >
                Appoint leader
              </Button>
            </>
          )
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge>{position.code}</Badge>
        <StatusPill
          tone={activeAppointments.length > 0 ? 'success' : 'warning'}
        >
          {activeAppointments.length > 0 ? 'Occupied' : 'Vacant'}
        </StatusPill>
        <StatusPill
          tone={position.status === 'active' ? 'success' : 'neutral'}
        >
          {titleCase(position.status)}
        </StatusPill>
        <Badge>{position.occupancyPolicy}</Badge>
      </div>

      {editing ? (
        <Panel title="Edit position">
          <form
            id={editFormId}
            onSubmit={(e) => {
              void handleSave(e);
            }}
            className="grid max-w-2xl gap-4 p-4 sm:p-5"
          >
            <Field label="Title" required>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </Field>
            <Field label="Description / responsibilities">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={4000}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
              <Field label="Occupancy">
                <Select
                  value={occupancyPolicy}
                  onChange={(e) => setOccupancyPolicy(e.target.value)}
                >
                  <option value="single">Single occupant</option>
                  <option value="multiple">Multiple occupants</option>
                </Select>
              </Field>
            </div>
            <Field label="Reports to">
              <Select
                value={reportsTo}
                onChange={(e) => setReportsTo(e.target.value)}
              >
                <option value="">None (top-level)</option>
                {allPositions
                  .filter((p) => p.id !== positionId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Linked organisational unit">
              <Select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
              >
                <option value="">None</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.kind})
                  </option>
                ))}
              </Select>
            </Field>
          </form>
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Code</dt>
                <dd className="font-medium text-foreground">{position.code}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Reports to</dt>
                <dd className="font-medium text-foreground">
                  {reportsToPosition ? (
                    <Link
                      href={`/admin/leadership/${reportsToPosition.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {reportsToPosition.title}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Linked unit</dt>
                <dd className="font-medium text-foreground">
                  {linkedUnit ? (
                    <Link
                      href={`/admin/organisation/${linkedUnit.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {linkedUnit.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Occupancy policy</dt>
                <dd className="font-medium text-foreground">
                  {position.occupancyPolicy === 'multiple'
                    ? 'Multiple occupants'
                    : 'Single occupant'}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Responsibilities</CardTitle>
            </CardHeader>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {position.description?.trim() ||
                'No description yet. Use Edit to capture published responsibilities and notes.'}
            </p>
          </Card>
        </div>
      )}

      {directReports.length > 0 ? (
        <Panel
          title="Direct reports"
          subtitle={`${directReports.length} position${directReports.length === 1 ? '' : 's'}`}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Title</TH>
                  <TH>Code</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {directReports.map((p) => (
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
        </Panel>
      ) : null}

      <Panel
        title="Appointments"
        subtitle={
          activeAppointments.length === 0
            ? 'Currently vacant'
            : `${activeAppointments.length} active`
        }
        actions={
          <Button size="sm" onClick={() => setAppointOpen(true)}>
            Appoint leader
          </Button>
        }
      >
        {appointments.length === 0 ? (
          <EmptyState
            icon="users"
            tone="gold"
            title="No appointments yet"
            description="Attach a person to this position when their People record exists. Appointing does not grant system roles."
            action={
              <Button size="sm" onClick={() => setAppointOpen(true)}>
                Appoint leader
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Person</TH>
                  <TH>Kind</TH>
                  <TH>From</TH>
                  <TH>To</TH>
                  <TH>Status</TH>
                  <TH className="w-28">
                    <span className="sr-only">Actions</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {appointments.map((row) => {
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
                      <TD>{titleCase(row.appointmentKind)}</TD>
                      <TD className="text-muted-foreground">
                        {formatDate(row.effectiveFrom)}
                      </TD>
                      <TD className="text-muted-foreground">
                        {row.effectiveTo
                          ? formatDate(row.effectiveTo)
                          : '—'}
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
                      <TD>
                        {row.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={endingId === row.id}
                            disabled={Boolean(endingId)}
                            onClick={() => void handleEndAppointment(row.id)}
                          >
                            End
                          </Button>
                        ) : null}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <AppointLeaderDialog
        open={appointOpen}
        positionId={positionId}
        positionTitle={position.title}
        onClose={() => setAppointOpen(false)}
        onCreated={() => {
          push({
            tone: 'success',
            message:
              'Leader appointed. Assign a system role under Church profile if they need login access.',
          });
          void load();
        }}
      />
    </div>
  );
}
