'use client';

import Link from 'next/link';
import { useCallback, useId, useMemo, useState, type FormEvent } from 'react';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  Dialog,
  DialogFooter,
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
  buttonClassName,
} from '@/app/_ekklesia/ui';
import type {
  LeadershipAppointment,
  LeadershipPosition,
  OrganisationalUnit,
} from '../../_lib/api-types';
import { asList } from '../../_lib/list';
import { t } from '@/app/_ekklesia/i18n/core';

export function LeadershipClient(): React.ReactElement {
  const { push } = useToast();
  const formId = useId();
  const [positions, setPositions] = useState<LeadershipPosition[]>([]);
  const [appointments, setAppointments] = useState<LeadershipAppointment[]>([]);
  const [units, setUnits] = useState<OrganisationalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reportsTo, setReportsTo] = useState('');
  const [unitId, setUnitId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [posPayload, apptPayload, unitPayload] = await Promise.all([
        apiFetch<LeadershipPosition[] | { data: LeadershipPosition[] }>(
          '/api/v1/positions?limit=200',
        ),
        apiFetch<LeadershipAppointment[] | { data: LeadershipAppointment[] }>(
          '/api/v1/appointments?status=active&limit=200',
        ).catch(() => ({ data: [] as LeadershipAppointment[] })),
        apiFetch<OrganisationalUnit[] | { data: OrganisationalUnit[] }>(
          '/api/v1/organisational-units?limit=200',
        ).catch(() => ({ data: [] as OrganisationalUnit[] })),
      ]);
      setPositions(asList(posPayload));
      setAppointments(asList(apptPayload));
      setUnits(asList(unitPayload));
    } catch (err) {
      setPositions([]);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('Unable to load leadership positions'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useLoadEffect(load);

  const occupied = useMemo(() => {
    const set = new Set<string>();
    for (const a of appointments) {
      if (a.status === 'active') set.add(a.positionId);
    }
    return set;
  }, [appointments]);

  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of positions) map.set(p.id, p.title);
    return map;
  }, [positions]);

  const handleCreate = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        occupancyPolicy: 'single',
      };
      if (description.trim()) body.description = description.trim();
      if (reportsTo) body.reportsToPositionId = reportsTo;
      if (unitId) body.organisationalUnitId = unitId;
      const created = await apiFetch<LeadershipPosition>('/api/v1/positions', {
        method: 'POST',
        json: body,
      });
      setPositions((prev) => [...prev, created]);
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setReportsTo('');
      setUnitId('');
      push({ tone: 'success', message: t('Position created (vacant).') });
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError ? err.message : t('Could not create position.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('Leadership')}
        lede={t('Positions and reporting relationships. Appointments do not grant system access — assign roles separately under Church profile.')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/leadership/requests"
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            >
              {t('Appointment requests')}
            </Link>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              {t('Add position')}
            </Button>
          </div>
        }
      />

      {loading ? (
        <Panel title={t('Positions')}>
          <div className="flex flex-col gap-3 p-4">
            <Skeleton size="heading" />
            <Skeleton size="line" />
          </div>
        </Panel>
      ) : error ? (
        <EmptyState
          icon="users"
          tone="gold"
          title={t('Could not load leadership')}
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              {t('Try again')}
            </Button>
          }
        />
      ) : positions.length === 0 ? (
        <EmptyState
          icon="users"
          tone="gold"
          title={t('No leadership positions yet')}
          description={t('Define titles and reporting lines before appointing people.')}
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              {t('Add position')}
            </Button>
          }
        />
      ) : (
        <Panel title={t('Positions')}>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>{t('Title')}</TH>
                  <TH>{t('Code')}</TH>
                  <TH>{t('Reports to')}</TH>
                  <TH>{t('Occupancy')}</TH>
                  <TH>{t('Status')}</TH>
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
                      {p.description ? (
                        <div className="mt-0.5 max-w-md text-xs text-muted-foreground">
                          {p.description}
                        </div>
                      ) : null}
                    </TD>
                    <TD>
                      <Badge>{p.code}</Badge>
                    </TD>
                    <TD>
                      {p.reportsToPositionId ? (
                        <Link
                          href={`/admin/leadership/${p.reportsToPositionId}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {titleById.get(p.reportsToPositionId) ?? '—'}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TD>
                    <TD>
                      <StatusPill
                        tone={occupied.has(p.id) ? 'success' : 'warning'}
                      >
                        {occupied.has(p.id) ? t('Occupied') : t('Vacant')}
                      </StatusPill>
                    </TD>
                    <TD>
                      <StatusPill
                        tone={p.status === 'active' ? 'success' : 'neutral'}
                      >
                        {p.status}
                      </StatusPill>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </Panel>
      )}

      <Dialog
        open={createOpen}
        onClose={() => {
          if (!submitting) setCreateOpen(false);
        }}
        title={t('Add leadership position')}
        description={t('Create a vacant position. Appoint people later; roles stay separate.')}
        footer={
          <DialogFooter>
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => setCreateOpen(false)}
            >
              {t('Cancel')}
            </Button>
            <Button type="submit" form={formId} loading={submitting}>
              {t('Create position')}
            </Button>
          </DialogFooter>
        }
      >
        <form
          id={formId}
          onSubmit={(e) => {
            void handleCreate(e);
          }}
          className="flex flex-col gap-4"
        >
          <Field label={t('Title')} required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </Field>
          <Field label={t('Description')}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={4000}
            />
          </Field>
          <Field label={t('Reports to')}>
            <Select
              value={reportsTo}
              onChange={(e) => setReportsTo(e.target.value)}
            >
              <option value="">{t('None (top-level)')}</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('Linked unit (optional)')}>
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">{t('None')}</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.kind})
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Dialog>
    </div>
  );
}
