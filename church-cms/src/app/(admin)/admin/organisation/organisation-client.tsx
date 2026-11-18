'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Panel,
  Skeleton,
  StatusPill,
  useToast,
} from '@/app/_ekklesia/ui';
import type { OrganisationalUnit } from '../../_lib/api-types';
import { asList } from '../../_lib/list';
import { CreateUnitDialog } from '../ministries/create-unit-dialog';
import { t } from '@/app/_ekklesia/i18n/core';

function buildTree(units: OrganisationalUnit[]): Array<{
  unit: OrganisationalUnit;
  depth: number;
}> {
  const byParent = new Map<string | null, OrganisationalUnit[]>();
  for (const unit of units) {
    const key = unit.parentId;
    const list = byParent.get(key) ?? [];
    list.push(unit);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const rows: Array<{ unit: OrganisationalUnit; depth: number }> = [];
  const walk = (parentId: string | null, depth: number): void => {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      rows.push({ unit: child, depth });
      walk(child.id, depth + 1);
    }
  };
  walk(null, 0);

  // Orphans whose parent is missing from the list
  const placed = new Set(rows.map((r) => r.unit.id));
  for (const unit of units) {
    if (!placed.has(unit.id)) {
      rows.push({ unit, depth: 0 });
    }
  }
  return rows;
}

export function OrganisationClient(): React.ReactElement {
  const { push } = useToast();
  const [units, setUnits] = useState<OrganisationalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<
        OrganisationalUnit[] | { data: OrganisationalUnit[] }
      >('/api/v1/organisational-units?limit=200');
      setUnits(asList(payload));
    } catch (err) {
      setUnits([]);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('Unable to load organisational structure'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useLoadEffect(load);

  const tree = useMemo(() => buildTree(units), [units]);

  const toggleStatus = async (unit: OrganisationalUnit): Promise<void> => {
    if (togglingId) return;
    setTogglingId(unit.id);
    const next = unit.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await apiFetch<OrganisationalUnit>(
        `/api/v1/organisational-units/${unit.id}`,
        { method: 'PATCH', json: { status: next } },
      );
      setUnits((prev) => prev.map((u) => (u.id === unit.id ? updated : u)));
      push({
        tone: 'success',
        message: next === 'active' ? t('Unit activated.') : t('Unit deactivated.'),
      });
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError
            ? err.message
            : t('Could not update unit status.'),
      });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('Organisation')}
        lede={t('Hierarchical units for this church. Structure does not grant system permissions.')}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            {t('Add unit')}
          </Button>
        }
      />

      {loading ? (
        <Panel title={t('Structure')}>
          <div className="flex flex-col gap-3 p-4">
            <Skeleton size="heading" />
            <Skeleton size="line" />
            <Skeleton size="line" />
          </div>
        </Panel>
      ) : error ? (
        <EmptyState
          icon="building"
          tone="gold"
          title={t('Could not load structure')}
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              {t('Try again')}
            </Button>
          }
        />
      ) : units.length === 0 ? (
        <EmptyState
          icon="building"
          tone="gold"
          title={t('No organisational units yet')}
          description={t('Create departments, ministries, teams, or branches for this church.')}
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              {t('Add unit')}
            </Button>
          }
        />
      ) : (
        <Panel title={t('Structure')}>
          <ul className="divide-y divide-border">
            {tree.map(({ unit, depth }) => (
              <li
                key={unit.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                style={{ paddingLeft: `${16 + depth * 20}px` }}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/organisation/${unit.id}`}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {unit.name}
                    </Link>
                    <Badge>{unit.code}</Badge>
                    <Badge>{unit.kind.replace('_', ' ')}</Badge>
                    {unit.metadata?.proposed === true ? (
                      <Badge>{t('Proposed')}</Badge>
                    ) : null}
                    <StatusPill
                      tone={unit.status === 'active' ? 'success' : 'neutral'}
                    >
                      {unit.status}
                    </StatusPill>
                  </div>
                  {unit.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {unit.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/organisation/${unit.id}`}>
                    <Button size="sm" variant="secondary">
                      {t('Open')}
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={togglingId === unit.id}
                    onClick={() => void toggleStatus(unit)}
                  >
                    {unit.status === 'active' ? t('Deactivate') : t('Activate')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <CreateUnitDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        parents={units}
        onCreated={(unit) => {
          setUnits((prev) => [...prev, unit]);
          setCreateOpen(false);
          push({ tone: 'success', message: t('Unit created.') });
        }}
      />
    </div>
  );
}
