'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError, useLoadEffect, useRole } from '@/app/_ekklesia/session';
import {
  Button,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  Skeleton,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/app/_ekklesia/ui';
import { asList } from '../../_lib/list';
import { extractValidationErrors } from '../people/form-errors';

interface RoleRow {
  id: string;
  code: string;
  name: string;
  permissions: string[];
  allowedScopes?: string[];
}

interface RoleTemplateRow {
  code: string;
  name: string;
  description: string;
  permissions: string[];
  allowedScopes: string[];
  bootstrap: boolean;
}

interface TemplateCompareRow {
  code: string;
  status: 'in_sync' | 'drift' | 'missing';
  added: string[];
  removed: string[];
}

interface PermissionRow {
  code: string;
  module: string;
  description: string;
  sensitivity: string;
}

interface OrgUserRow {
  id: string;
  userAccountId: string;
  label: string;
}

interface AssignmentRow {
  id: string;
  userAccountId: string;
  roleId: string;
  scopeType: string;
  organisationalUnitId: string | null;
}

interface UnitRow {
  id: string;
  name: string;
  kind: string;
  status: string;
}

interface MemberAccess {
  userAccountId: string;
  assignments: Array<{
    id: string;
    roleCode: string;
    roleName: string;
    scopeType: string;
    organisationalUnitId: string | null;
    sourceAppointmentId?: string | null;
  }>;
  appointments?: Array<{
    id: string;
    positionId: string;
    organisationalUnitId: string | null;
    appointmentKind: string;
    status: string;
    effectiveFrom: string;
    effectiveTo: string | null;
  }>;
  effectivePermissions: Array<{
    code: string;
    module: string;
    description: string;
    sensitivity: string;
    scopes: Array<{ type: string; organisationalUnitId?: string }>;
  }>;
}

type Tab = 'roles' | 'matrix' | 'assignments' | 'review' | 'templates';

/**
 * Roles & Permissions workspace — catalogue-driven matrix, assignments, access review.
 */
export function RolesWorkspaceClient(): React.ReactElement {
  const t = useTranslations('AdminRoles');
  const tc = useTranslations('Common');
  const searchParams = useSearchParams();
  const { can, isPlatformOperator } = useRole();
  const { push } = useToast();
  const canAssign = can('roles:assign') || isPlatformOperator;
  const canRead = can('roles:read') || canAssign;

  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'roles';
  const [tab, setTab] = useState<Tab>(
    ['roles', 'matrix', 'assignments', 'review', 'templates'].includes(
      initialTab,
    )
      ? initialTab
      : 'roles',
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [orgUsers, setOrgUsers] = useState<OrgUserRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [matrixSelection, setMatrixSelection] = useState<Set<string>>(new Set());
  const [confirmHighRisk, setConfirmHighRisk] = useState(false);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCode, setNewRoleCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [assignUserId, setAssignUserId] = useState(
    searchParams.get('userAccountId') ?? '',
  );
  const [assignRoleId, setAssignRoleId] = useState('');
  const [assignScope, setAssignScope] = useState('church');
  const [assignUnitId, setAssignUnitId] = useState(
    searchParams.get('organisationalUnitId') ?? '',
  );
  const [sourceAppointmentId, setSourceAppointmentId] = useState(
    searchParams.get('sourceAppointmentId') ?? '',
  );
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [rematrixing, setRematrixing] = useState(false);
  const [reviewUserId, setReviewUserId] = useState(
    searchParams.get('userAccountId') ?? '',
  );
  const [review, setReview] = useState<MemberAccess | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [templates, setTemplates] = useState<RoleTemplateRow[]>([]);
  const [compareRows, setCompareRows] = useState<TemplateCompareRow[]>([]);
  const [compareMeta, setCompareMeta] = useState<{
    driftCount: number;
    missingCount: number;
    inSyncCount: number;
  } | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  useEffect(() => {
    if (assignUnitId && assignScope !== 'organisational_unit') {
      setAssignScope('organisational_unit');
    }
  }, [assignUnitId, assignScope]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permRes, usersRes, assignRes, unitsRes, templatesRes] =
        await Promise.all([
          apiFetch<RoleRow[]>('/api/v1/roles?includePermissions=1'),
          apiFetch<PermissionRow[]>('/api/v1/permissions'),
          apiFetch<OrgUserRow[]>('/api/v1/organisation-users'),
          apiFetch<AssignmentRow[]>('/api/v1/role-assignments?limit=100'),
          apiFetch<UnitRow[]>(
            '/api/v1/organisational-units?limit=200&status=active',
          ).catch(() => [] as UnitRow[]),
          apiFetch<RoleTemplateRow[]>('/api/v1/role-templates').catch(
            () => [] as RoleTemplateRow[],
          ),
        ]);
      const roleList = asList(rolesRes);
      setRoles(roleList);
      setPermissions(asList(permRes));
      setOrgUsers(asList(usersRes));
      setAssignments(asList(assignRes));
      setUnits(asList(unitsRes).filter((u) => u.status === 'active'));
      setTemplates(asList(templatesRes));
      if (!selectedRoleId && roleList[0]) {
        setSelectedRoleId(roleList[0].id);
        setMatrixSelection(new Set(roleList[0].permissions ?? []));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId, t]);

  const bootLoad = useCallback(() => {
    if (!canRead) return;
    void load();
  }, [canRead, load]);

  useLoadEffect(bootLoad);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const permissionsByModule = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const p of permissions) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const onSelectRole = (roleId: string): void => {
    setSelectedRoleId(roleId);
    const role = roles.find((r) => r.id === roleId);
    setMatrixSelection(new Set(role?.permissions ?? []));
    setConfirmHighRisk(false);
  };

  const togglePermission = (code: string): void => {
    setMatrixSelection((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const saveMatrix = async (): Promise<void> => {
    if (!selectedRoleId || !canAssign) return;
    setSavingMatrix(true);
    try {
      const updated = await apiFetch<RoleRow>(
        `/api/v1/roles/${selectedRoleId}/permissions`,
        {
          method: 'PUT',
          json: {
            permissions: [...matrixSelection],
            confirmHighRisk: confirmHighRisk || undefined,
          },
        },
      );
      push({ tone: 'success', title: t('matrixSaved') , message: t('matrixSaved') });
      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRoleId
            ? { ...r, permissions: updated.permissions }
            : r,
        ),
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('saveFailed');
      push({ tone: 'danger', title: msg , message: msg });
    } finally {
      setSavingMatrix(false);
    }
  };

  const createCustomRole = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!canAssign) return;
    setCreating(true);
    try {
      const created = await apiFetch<RoleRow>('/api/v1/roles', {
        method: 'POST',
        json: {
          name: newRoleName,
          code: newRoleCode,
          permissions: [],
        },
      });
      setRoles((prev) => [...prev, created]);
      setNewRoleName('');
      setNewRoleCode('');
      onSelectRole(created.id);
      push({
        tone: 'success',
        title: t('roleCreated'),
        message: t('roleCreated'),
      });
    } catch (err) {
      const fields =
        err instanceof ApiError
          ? extractValidationErrors(err)
          : {
              formError:
                err instanceof Error ? err.message : t('saveFailed'),
            };
      push({
        tone: 'danger',
        title: t('saveFailed'),
        message: fields.formError ?? t('saveFailed'),
      });
    } finally {
      setCreating(false);
    }
  };

  const assignRoleScopes = useMemo(() => {
    const role = roles.find((r) => r.id === assignRoleId);
    const allowed = role?.allowedScopes;
    if (allowed && allowed.length > 0) return allowed;
    const template = templates.find((tpl) => tpl.code === role?.code);
    if (template?.allowedScopes?.length) return template.allowedScopes;
    return ['church', 'organisational_unit', 'self', 'household'];
  }, [assignRoleId, roles, templates]);

  const assignRole = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!canAssign) return;
    if (assignScope === 'organisational_unit' && !assignUnitId) {
      push({
        tone: 'danger',
        title: t('saveFailed'),
        message: t('unitRequired'),
      });
      return;
    }
    setAssigning(true);
    try {
      await apiFetch('/api/v1/role-assignments', {
        method: 'POST',
        json: {
          userAccountId: assignUserId,
          roleId: assignRoleId,
          scopeType: assignScope,
          ...(assignScope === 'organisational_unit'
            ? { organisationalUnitId: assignUnitId }
            : {}),
          ...(sourceAppointmentId
            ? { sourceAppointmentId }
            : {}),
        },
      });
      push({
        tone: 'success',
        title: t('assigned'),
        message: t('assigned'),
      });
      setSourceAppointmentId('');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('saveFailed');
      push({ tone: 'danger', title: msg, message: msg });
    } finally {
      setAssigning(false);
    }
  };

  const duplicateSelectedRole = async (): Promise<void> => {
    if (!canAssign || !selectedRole) return;
    const code = window.prompt(t('duplicateCodePrompt'), `${selectedRole.code}_copy`);
    if (!code) return;
    const name = window.prompt(t('duplicateNamePrompt'), `${selectedRole.name} (copy)`);
    if (!name) return;
    setDuplicatingId(selectedRole.id);
    try {
      const created = await apiFetch<RoleRow>(
        `/api/v1/roles/${selectedRole.id}/duplicate`,
        { method: 'POST', json: { code, name } },
      );
      push({ tone: 'success', title: t('duplicated'), message: t('duplicated') });
      await load();
      onSelectRole(created.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('saveFailed');
      push({ tone: 'danger', title: msg, message: msg });
    } finally {
      setDuplicatingId(null);
    }
  };

  const deactivateSelectedRole = async (): Promise<void> => {
    if (!canAssign || !selectedRole) return;
    const ok = window.confirm(t('deactivateConfirm', { name: selectedRole.name }));
    if (!ok) return;
    setDeactivatingId(selectedRole.id);
    try {
      await apiFetch(`/api/v1/roles/${selectedRole.id}`, { method: 'DELETE' });
      push({
        tone: 'success',
        title: t('deactivated'),
        message: t('deactivated'),
      });
      setSelectedRoleId('');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('saveFailed');
      push({ tone: 'danger', title: msg, message: msg });
    } finally {
      setDeactivatingId(null);
    }
  };

  const loadTemplateCompare = async (): Promise<void> => {
    try {
      const result = await apiFetch<{
        data: TemplateCompareRow[];
        meta: {
          driftCount: number;
          missingCount: number;
          inSyncCount: number;
        };
      }>('/api/v1/roles/compare-templates', {
        method: 'POST',
        json: {},
      });
      setCompareRows(result.data);
      setCompareMeta(result.meta);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('loadFailed');
      push({ tone: 'danger', title: msg, message: msg });
    }
  };

  const applyTemplates = async (): Promise<void> => {
    if (!canAssign) return;
    setRematrixing(true);
    try {
      const compare = await apiFetch<{
        meta: { driftCount: number; missingCount: number; inSyncCount: number };
      }>('/api/v1/roles/compare-templates', {
        method: 'POST',
        json: {},
      });
      const drift = compare.meta.driftCount;
      const missing = compare.meta.missingCount;
      const prompt =
        drift > 0 || missing > 0
          ? t('rematrixConfirmDrift', { drift, missing })
          : t('rematrixConfirmInSync');
      const ok = window.confirm(prompt);
      if (!ok) return;

      await apiFetch('/api/v1/roles/apply-templates', {
        method: 'POST',
        json: { confirm: true },
      });
      push({
        tone: 'success',
        title: t('rematrixDone'),
        message: t('rematrixDone'),
      });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('saveFailed');
      push({ tone: 'danger', title: msg, message: msg });
    } finally {
      setRematrixing(false);
    }
  };

  const revokeAssignment = async (id: string): Promise<void> => {
    if (!canAssign) return;
    try {
      await apiFetch(`/api/v1/role-assignments/${id}`, { method: 'DELETE' });
      push({
        tone: 'success',
        title: t('revoked'),
        message: t('revoked'),
      });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('saveFailed');
      push({ tone: 'danger', title: msg, message: msg });
    }
  };

  const loadReview = async (): Promise<void> => {
    if (!reviewUserId) return;
    setReviewLoading(true);
    try {
      const res = await apiFetch<MemberAccess>(
        `/api/v1/organisation-users/${reviewUserId}/access`,
      );
      setReview(res);
    } catch (err) {
      setReview(null);
      const msg = err instanceof Error ? err.message : t('loadFailed');
      push({ tone: 'danger', title: msg, message: msg });
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'review' && reviewUserId && !review) {
      void loadReview();
    }
    if (tab === 'templates' && compareRows.length === 0) {
      void loadTemplateCompare();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot prefills
  }, [tab]);

  if (!canRead) {
    return (
      <EmptyState
        title={t('deniedTitle')}
        description={t('deniedBody')}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title={t('title')} lede={t('lede')} />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState title={t('loadFailed')} description={error} />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('title')} lede={t('lede')} />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['roles', t('tabRoles')],
            ['matrix', t('tabMatrix')],
            ['assignments', t('tabAssignments')],
            ['review', t('tabReview')],
            ['templates', t('tabTemplates')],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            variant={tab === id ? 'primary' : 'ghost'}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'roles' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title={t('rolesList')}>
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>{t('colName')}</TH>
                    <TH>{t('colCode')}</TH>
                    <TH>{t('colPerms')}</TH>
                  </TR>
                </THead>
                <TBody>
                  {roles.map((role) => (
                    <TR
                      key={role.id}
                      className={
                        role.id === selectedRoleId
                          ? 'bg-[color:var(--surface-muted)]'
                          : undefined
                      }
                    >
                      <TD>
                        <button
                          type="button"
                          className="text-left underline-offset-2 hover:underline"
                          onClick={() => {
                            onSelectRole(role.id);
                            setTab('matrix');
                          }}
                        >
                          {role.name}
                        </button>
                      </TD>
                      <TD>
                        <code className="text-xs">{role.code}</code>
                      </TD>
                      <TD>{role.permissions?.length ?? 0}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </Panel>

          {canAssign ? (
            <Panel title={t('createRole')}>
              <form className="flex flex-col gap-3" onSubmit={createCustomRole}>
                <Field label={t('roleName')}>
                  <Input
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    required
                  />
                </Field>
                <Field label={t('roleCode')} hint={t('roleCodeHint')}>
                  <Input
                    value={newRoleCode}
                    onChange={(e) => setNewRoleCode(e.target.value)}
                    pattern="[a-z][a-z0-9_]*"
                    required
                  />
                </Field>
                <Button type="submit" disabled={creating}>
                  {creating ? tc('saving') : t('createRole')}
                </Button>
              </form>
              <div className="mt-6 border-t border-border pt-4">
                <p className="mb-2 text-sm text-[color:var(--muted)]">
                  {t('rematrixHint')}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={rematrixing}
                  onClick={() => void applyTemplates()}
                >
                  {rematrixing ? tc('saving') : t('rematrix')}
                </Button>
              </div>
              {selectedRole ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={Boolean(duplicatingId)}
                    onClick={() => void duplicateSelectedRole()}
                  >
                    {duplicatingId ? tc('saving') : t('duplicateRole')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={Boolean(deactivatingId)}
                    onClick={() => void deactivateSelectedRole()}
                  >
                    {deactivatingId ? tc('saving') : t('deactivateRole')}
                  </Button>
                </div>
              ) : null}
            </Panel>
          ) : null}
        </div>
      ) : null}

      {tab === 'matrix' ? (
        <Panel title={t('tabMatrix')}>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Field label={t('selectRole')} className="min-w-[220px]">
              <Select
                value={selectedRoleId}
                onChange={(e) => onSelectRole(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            {canAssign ? (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={confirmHighRisk}
                    onChange={(e) => setConfirmHighRisk(e.target.checked)}
                  />
                  {t('confirmHighRisk')}
                </label>
                <Button
                  type="button"
                  onClick={() => void saveMatrix()}
                  disabled={savingMatrix || !selectedRole}
                >
                  {savingMatrix ? tc('saving') : t('saveMatrix')}
                </Button>
              </>
            ) : null}
          </div>

          {permissionsByModule.map(([module, perms]) => (
            <div key={module} className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                {module}
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {perms.map((p) => (
                  <li key={p.code} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={matrixSelection.has(p.code)}
                      disabled={!canAssign}
                      onChange={() => togglePermission(p.code)}
                    />
                    <span>
                      <code className="text-xs">{p.code}</code>
                      <span className="ml-2 text-[color:var(--muted)]">
                        ({p.sensitivity})
                      </span>
                      <br />
                      {p.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Panel>
      ) : null}

      {tab === 'assignments' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {canAssign ? (
            <Panel title={t('assignRole')}>
              <form className="flex flex-col gap-3" onSubmit={assignRole}>
                <Field label={t('member')}>
                  <Select
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    required
                  >
                    <option value="">{tc('select')}</option>
                    {orgUsers.map((u) => (
                      <option key={u.userAccountId} value={u.userAccountId}>
                        {u.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('role')}>
                  <Select
                    value={assignRoleId}
                    onChange={(e) => setAssignRoleId(e.target.value)}
                    required
                  >
                    <option value="">{tc('select')}</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('scope')}>
                  <Select
                    value={
                      assignRoleScopes.includes(assignScope)
                        ? assignScope
                        : (assignRoleScopes[0] ?? 'church')
                    }
                    onChange={(e) => {
                      setAssignScope(e.target.value);
                      if (e.target.value !== 'organisational_unit') {
                        setAssignUnitId('');
                      }
                    }}
                  >
                    {assignRoleScopes.map((scope) => (
                      <option key={scope} value={scope}>
                        {scope}
                      </option>
                    ))}
                  </Select>
                </Field>
                {assignScope === 'organisational_unit' ? (
                  <Field label={t('organisationalUnit')}>
                    <Select
                      value={assignUnitId}
                      onChange={(e) => setAssignUnitId(e.target.value)}
                      required
                    >
                      <option value="">{tc('select')}</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.kind})
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
                {sourceAppointmentId ? (
                  <p className="text-xs text-[color:var(--muted)]">
                    {t('linkedAppointment', {
                      id: sourceAppointmentId.slice(0, 8),
                    })}
                  </p>
                ) : null}
                <Button type="submit" disabled={assigning}>
                  {assigning ? tc('saving') : t('assignRole')}
                </Button>
              </form>
            </Panel>
          ) : null}

          <Panel title={t('activeAssignments')}>
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>{t('member')}</TH>
                    <TH>{t('role')}</TH>
                    <TH>{t('scope')}</TH>
                    <TH />
                  </TR>
                </THead>
                <TBody>
                  {assignments.map((a) => {
                    const user = orgUsers.find(
                      (u) => u.userAccountId === a.userAccountId,
                    );
                    const role = roles.find((r) => r.id === a.roleId);
                    return (
                      <TR key={a.id}>
                        <TD>{user?.label ?? a.userAccountId.slice(0, 8)}</TD>
                        <TD>{role?.name ?? a.roleId.slice(0, 8)}</TD>
                        <TD>{a.scopeType}</TD>
                        <TD>
                          {canAssign ? (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => void revokeAssignment(a.id)}
                            >
                              {t('revoke')}
                            </Button>
                          ) : null}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </TableWrap>
          </Panel>
        </div>
      ) : null}

      {tab === 'review' ? (
        <Panel title={t('tabReview')}>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Field label={t('member')} className="min-w-[240px]">
              <Select
                value={reviewUserId}
                onChange={(e) => setReviewUserId(e.target.value)}
              >
                <option value="">{tc('select')}</option>
                {orgUsers.map((u) => (
                  <option key={u.userAccountId} value={u.userAccountId}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              type="button"
              onClick={() => void loadReview()}
              disabled={!reviewUserId || reviewLoading}
            >
              {reviewLoading ? tc('loading') : t('reviewAccess')}
            </Button>
          </div>

          {review ? (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold">{t('activeRoles')}</h3>
                <ul className="list-disc pl-5 text-sm">
                  {review.assignments.map((a) => (
                    <li key={a.id}>
                      {a.roleName} ({a.roleCode}) — {a.scopeType}
                      {a.organisationalUnitId
                        ? ` / ${a.organisationalUnitId.slice(0, 8)}`
                        : ''}
                      {a.sourceAppointmentId
                        ? ` · appt ${a.sourceAppointmentId.slice(0, 8)}`
                        : ''}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  {t('leadershipAppointments')}
                </h3>
                {(review.appointments?.length ?? 0) === 0 ? (
                  <p className="text-sm text-[color:var(--muted)]">
                    {t('noAppointments')}
                  </p>
                ) : (
                  <ul className="list-disc pl-5 text-sm">
                    {review.appointments!.map((a) => (
                      <li key={a.id}>
                        {a.appointmentKind} — {a.status} ({a.effectiveFrom}
                        {a.effectiveTo ? ` → ${a.effectiveTo}` : ''})
                        {a.organisationalUnitId
                          ? ` / unit ${a.organisationalUnitId.slice(0, 8)}`
                          : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  {t('effectivePermissions')}
                </h3>
                <ul className="grid gap-1 text-sm sm:grid-cols-2">
                  {review.effectivePermissions.map((p) => (
                    <li key={p.code}>
                      <code className="text-xs">{p.code}</code>
                      <span className="ml-2 text-[color:var(--muted)]">
                        {p.scopes.map((s) => s.type).join(', ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <EmptyState title={t('pickMember')} description={t('pickMemberBody')} />
          )}
        </Panel>
      ) : null}

      {tab === 'templates' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title={t('templateLibrary')}>
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>{t('colName')}</TH>
                    <TH>{t('colCode')}</TH>
                    <TH>{t('scope')}</TH>
                  </TR>
                </THead>
                <TBody>
                  {templates.map((tpl) => (
                    <TR key={tpl.code}>
                      <TD>
                        <div className="font-medium">{tpl.name}</div>
                        <div className="text-xs text-[color:var(--muted)]">
                          {tpl.description}
                        </div>
                      </TD>
                      <TD>
                        <code className="text-xs">{tpl.code}</code>
                      </TD>
                      <TD className="text-xs">
                        {tpl.allowedScopes.join(', ')}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </Panel>
          <Panel title={t('templateDrift')}>
            {compareMeta ? (
              <p className="mb-3 text-sm text-[color:var(--muted)]">
                {t('driftSummary', {
                  drift: compareMeta.driftCount,
                  missing: compareMeta.missingCount,
                  inSync: compareMeta.inSyncCount,
                })}
              </p>
            ) : null}
            <ul className="mb-4 flex flex-col gap-2 text-sm">
              {compareRows.map((row) => (
                <li
                  key={row.code}
                  className="rounded-md border border-border px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs">{row.code}</code>
                    <span>{row.status}</span>
                  </div>
                  {row.added.length > 0 ? (
                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                      + {row.added.join(', ')}
                    </p>
                  ) : null}
                  {row.removed.length > 0 ? (
                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                      − {row.removed.join(', ')}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void loadTemplateCompare()}
              >
                {t('refreshCompare')}
              </Button>
              {canAssign ? (
                <Button
                  type="button"
                  disabled={rematrixing}
                  onClick={() => void applyTemplates()}
                >
                  {rematrixing ? tc('saving') : t('rematrix')}
                </Button>
              ) : null}
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
