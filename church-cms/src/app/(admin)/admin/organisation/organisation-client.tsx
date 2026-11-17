'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
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
            : 'Unable to load organisational structure',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
        message: next === 'active' ? 'Unit activated.' : 'Unit deactivated.',
      });
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError
            ? err.message
            : 'Could not update unit status.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Organisation"
        lede="Hierarchical units for this church. Structure does not grant system permissions."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Add unit
          </Button>
        }
      />

      {loading ? (
        <Panel title="Structure">
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
          title="Could not load structure"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          }
        />
      ) : units.length === 0 ? (
        <EmptyState
          icon="building"
          tone="gold"
          title="No organisational units yet"
          description="Create departments, ministries, teams, or branches for this church."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Add unit
            </Button>
          }
        />
      ) : (
        <Panel title="Structure">
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
                      <Badge>Proposed</Badge>
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
                      Open
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={togglingId === unit.id}
                    onClick={() => void toggleStatus(unit)}
                  >
                    {unit.status === 'active' ? 'Deactivate' : 'Activate'}
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
          push({ tone: 'success', message: 'Unit created.' });
        }}
      />
    </div>
  );
}
