'use client';

import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Button,
  EmptyState,
  Field,
  Input,
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
import { normalizeTanzaniaPhoneE164 } from '@/platform/phone';
import { asList } from '../../_lib/list';
import { extractValidationErrors } from '../people/form-errors';

interface RoleRow {
  id: string;
  code: string;
  name: string;
}

interface RoleAssignmentRow {
  id: string;
  userAccountId: string;
  roleId: string;
  scopeType: string;
}

interface OrganisationUserRow {
  id: string;
  userAccountId: string;
  label: string;
  email: string | null;
}

const INVITE_ROLE_OPTIONS = [
  { code: 'pastoral_leadership', label: 'Pastoral Leadership' },
  { code: 'senior_pastor', label: 'Senior Pastor' },
  { code: 'church_administrator', label: 'Church Administrator' },
  { code: 'finance_officer', label: 'Finance Officer' },
] as const;

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

/**
 * System RBAC access — kept separate from organisational leadership positions.
 */
export function SettingsAccessClient(): React.ReactElement {
  const { push } = useToast();
  const assignFormId = useId();
  const inviteFormId = useId();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [orgUsers, setOrgUsers] = useState<OrganisationUserRow[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignmentRow[]>([]);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [userAccountId, setUserAccountId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignFieldErrors, setAssignFieldErrors] = useState<
    Record<string, string>
  >({});
  const [assignFormError, setAssignFormError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRoleCode, setInviteRoleCode] = useState('pastoral_leadership');
  const [inviting, setInviting] = useState(false);
  const [inviteFieldErrors, setInviteFieldErrors] = useState<
    Record<string, string>
  >({});
  const [inviteFormError, setInviteFormError] = useState<string | null>(null);
  const [issuedInvite, setIssuedInvite] = useState<{
    email: string;
    phoneE164: string | null;
    roleName: string;
    initialPin: string;
  } | null>(null);

  const loadAccess = useCallback(async (): Promise<void> => {
    setAccessLoading(true);
    setAccessError(null);
    try {
      const [rolesPayload, assignmentsPayload, usersPayload] =
        await Promise.all([
          apiFetch<RoleRow[] | { data: RoleRow[] }>('/api/v1/roles'),
          apiFetch<RoleAssignmentRow[] | { data: RoleAssignmentRow[] }>(
            '/api/v1/role-assignments',
          ),
          apiFetch<OrganisationUserRow[] | { data: OrganisationUserRow[] }>(
            '/api/v1/organisation-users',
          ),
        ]);
      const nextRoles = asList(rolesPayload);
      const nextUsers = asList(usersPayload);
      setRoles(nextRoles);
      setOrgUsers(nextUsers);
      setAssignments(asList(assignmentsPayload));
      setRoleId((prev) => prev || nextRoles[0]?.id || '');
      setUserAccountId((prev) => {
        if (prev && nextUsers.some((u) => u.userAccountId === prev)) {
          return prev;
        }
        return nextUsers[0]?.userAccountId ?? '';
      });
    } catch (err) {
      setRoles([]);
      setOrgUsers([]);
      setAssignments([]);
      setAccessError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load roles',
      );
    } finally {
      setAccessLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  const roleName = (id: string): string =>
    roles.find((r) => r.id === id)?.name ?? shortId(id);

  const userLabel = (accountId: string): string => {
    const match = orgUsers.find((u) => u.userAccountId === accountId);
    if (!match) return shortId(accountId);
    if (match.email && match.label !== match.email) {
      return `${match.label} · ${match.email}`;
    }
    return match.label;
  };

  const handleInvite = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (inviting) return;
    setInviting(true);
    setInviteFieldErrors({});
    setInviteFormError(null);
    try {
      const created = await apiFetch<{
        email: string;
        phoneE164: string | null;
        roleName: string;
        initialPin: string;
      }>('/api/v1/leadership-invites', {
        method: 'POST',
        json: {
          displayName: inviteName.trim(),
          email: inviteEmail.trim(),
          phoneE164: invitePhone.trim()
            ? (normalizeTanzaniaPhoneE164(invitePhone.trim()) ??
              invitePhone.trim())
            : undefined,
          roleCode: inviteRoleCode,
        },
      });
      setIssuedInvite({
        email: created.email,
        phoneE164: created.phoneE164,
        roleName: created.roleName,
        initialPin: created.initialPin,
      });
      setInviteName('');
      setInviteEmail('');
      setInvitePhone('');
      push({ tone: 'success', message: 'Leadership account created.' });
      void loadAccess();
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setInviteFieldErrors(parsed.fieldErrors);
        setInviteFormError(parsed.formError ?? err.message);
      } else {
        setInviteFormError(
          err instanceof Error ? err.message : 'Could not invite leadership.',
        );
      }
    } finally {
      setInviting(false);
    }
  };

  const handleAssign = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (assigning) return;
    setAssigning(true);
    setAssignFieldErrors({});
    setAssignFormError(null);
    try {
      const created = await apiFetch<RoleAssignmentRow>(
        '/api/v1/role-assignments',
        {
          method: 'POST',
          json: {
            userAccountId: userAccountId.trim(),
            roleId,
            scopeType: 'church',
          },
        },
      );
      setAssignments((prev) => [created, ...prev]);
      push({ tone: 'success', message: 'Role assigned.' });
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setAssignFieldErrors(parsed.fieldErrors);
        setAssignFormError(parsed.formError ?? err.message);
      } else {
        setAssignFormError(
          err instanceof Error ? err.message : 'Could not assign role.',
        );
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleRevoke = async (assignmentId: string): Promise<void> => {
    if (revokingId) return;
    setRevokingId(assignmentId);
    try {
      await apiFetch(`/api/v1/role-assignments/${assignmentId}`, {
        method: 'DELETE',
      });
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      push({ tone: 'success', message: 'Role revoked.' });
    } catch (err) {
      push({
        tone: 'danger',
        message:
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not revoke role.',
      });
    } finally {
      setRevokingId(null);
    }
  };

  if (accessLoading) {
    return (
      <Panel title="Roles / Access">
        <div className="flex flex-col gap-3 p-4">
          <Skeleton size="heading" />
          <Skeleton size="line" />
        </div>
      </Panel>
    );
  }

  if (accessError) {
    return (
      <EmptyState
        icon="shield"
        tone="gold"
        title="Could not load roles"
        description={accessError}
        action={
          <Button variant="secondary" onClick={() => void loadAccess()}>
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <Panel title="Roles / Access">
      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">
          System access is separate from organisational leadership positions.
          Appointing someone as a pastor does not grant admin permissions — assign
          a role here explicitly.
        </p>

        {issuedInvite ? (
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="font-medium">Leadership credentials issued (once)</p>
            <p>
              {issuedInvite.email}
              {issuedInvite.phoneE164 ? ` · ${issuedInvite.phoneE164}` : ''} ·{' '}
              {issuedInvite.roleName}
            </p>
            <p>
              PIN: <code>{issuedInvite.initialPin}</code>
            </p>
          </div>
        ) : null}

        <form
          id={inviteFormId}
          onSubmit={(e) => {
            void handleInvite(e);
          }}
          className="flex max-w-xl flex-col gap-4"
        >
          {inviteFormError ? (
            <div role="alert" className="text-sm text-[color:var(--danger-ink)]">
              {inviteFormError}
            </div>
          ) : null}
          <Field label="Display name" required error={inviteFieldErrors.displayName}>
            <Input
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              maxLength={120}
            />
          </Field>
          <Field label="Email" required error={inviteFieldErrors.email}>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </Field>
          <Field label="Phone" error={inviteFieldErrors.phoneE164}>
            <Input
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              placeholder="0712 345 678"
            />
          </Field>
          <Field label="Role" required>
            <Select
              value={inviteRoleCode}
              onChange={(e) => setInviteRoleCode(e.target.value)}
            >
              {INVITE_ROLE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" size="sm" loading={inviting}>
            Invite leadership
          </Button>
        </form>

        <hr className="border-border" />

        <form
          id={assignFormId}
          onSubmit={(e) => {
            void handleAssign(e);
          }}
          className="flex max-w-xl flex-col gap-4"
        >
          {assignFormError ? (
            <div role="alert" className="text-sm text-[color:var(--danger-ink)]">
              {assignFormError}
            </div>
          ) : null}
          <Field label="Person" required error={assignFieldErrors.userAccountId}>
            <Select
              value={userAccountId}
              onChange={(e) => setUserAccountId(e.target.value)}
              disabled={orgUsers.length === 0}
            >
              {orgUsers.map((user) => (
                <option key={user.userAccountId} value={user.userAccountId}>
                  {user.email ? `${user.label} · ${user.email}` : user.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Role" required error={assignFieldErrors.roleId}>
            <Select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={roles.length === 0}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            type="submit"
            size="sm"
            loading={assigning}
            disabled={roles.length === 0 || orgUsers.length === 0}
          >
            Assign role
          </Button>
        </form>

        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active role assignments yet.
          </p>
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Person</TH>
                  <TH>Role</TH>
                  <TH>Scope</TH>
                  <TH className="w-28">
                    <span className="sr-only">Actions</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {assignments.map((row) => (
                  <TR key={row.id}>
                    <TD>{userLabel(row.userAccountId)}</TD>
                    <TD>{roleName(row.roleId)}</TD>
                    <TD>{row.scopeType.replaceAll('_', ' ')}</TD>
                    <TD>
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={revokingId === row.id}
                        disabled={Boolean(revokingId)}
                        onClick={() => void handleRevoke(row.id)}
                      >
                        Revoke
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </div>
    </Panel>
  );
}
