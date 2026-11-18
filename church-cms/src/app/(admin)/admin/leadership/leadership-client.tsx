'use client';

import Link from 'next/link';
import { useCallback, useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
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

export function LeadershipClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tl = useTranslations('AdminLeadership');
  const tc = useTranslations('Common');
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
            : tl('unableLoadPositions'),
      );
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
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
      push({ tone: 'success', message: tl('positionCreated') });
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError ? err.message : tl('couldNotCreatePosition'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('leadership')}
        lede={t('leadershipLede')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/leadership/requests"
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
            >
              {tl('appointmentRequests')}
            </Link>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              {tl('addPosition')}
            </Button>
          </div>
        }
      />

      {loading ? (
        <Panel title={tl('positions')}>
          <div className="flex flex-col gap-3 p-4">
            <Skeleton size="heading" />
            <Skeleton size="line" />
          </div>
        </Panel>
      ) : error ? (
        <EmptyState
          icon="users"
          tone="gold"
          title={tl('couldNotLoadLeadership')}
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              {tc('retry')}
            </Button>
          }
        />
      ) : positions.length === 0 ? (
        <EmptyState
          icon="users"
          tone="gold"
          title={tl('noPositionsYet')}
          description={tl('noPositionsBody')}
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              {tl('addPosition')}
            </Button>
          }
        />
      ) : (
        <Panel title={tl('positions')}>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>{tl('title')}</TH>
                  <TH>{tl('code')}</TH>
                  <TH>{tl('reportsTo')}</TH>
                  <TH>{tl('occupancy')}</TH>
                  <TH>{tl('status')}</TH>
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
                          {titleById.get(p.reportsToPositionId) ?? tl('emDash')}
                        </Link>
                      ) : (
                        tl('emDash')
                      )}
                    </TD>
                    <TD>
                      <StatusPill
                        tone={occupied.has(p.id) ? 'success' : 'warning'}
                      >
                        {occupied.has(p.id) ? tl('occupied') : tl('vacant')}
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
        title={tl('addPositionTitle')}
        description={tl('addPositionDesc')}
        footer={
          <DialogFooter>
            <Button
              variant="secondary"
              disabled={submitting}
              onClick={() => setCreateOpen(false)}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" form={formId} loading={submitting}>
              {tl('createPosition')}
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
          <Field label={tl('title')} required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </Field>
          <Field label={tl('description')}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={4000}
            />
          </Field>
          <Field label={tl('reportsTo')}>
            <Select
              value={reportsTo}
              onChange={(e) => setReportsTo(e.target.value)}
            >
              <option value="">{tl('noneTopLevel')}</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={tl('linkedUnitOptional')}>
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">{tl('none')}</option>
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
