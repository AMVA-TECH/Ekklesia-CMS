'use client';

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type FormEvent,
} from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
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

interface ChurchProfile {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  defaultLocale: string;
}

interface RoleRow {
  id: string;
  code: string;
  name: string;
  permissions?: string[];
}

interface RoleAssignmentRow {
  id: string;
  userAccountId: string;
  roleId: string;
  scopeType: string;
  organisationalUnitId: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

const TIMEZONES = [
  'Africa/Dar_es_Salaam',
  'Africa/Nairobi',
  'Africa/Kampala',
  'Africa/Johannesburg',
  'UTC',
] as const;

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Kiswahili' },
] as const;

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

/**
 * Church profile settings — name, timezone, default locale — plus role access.
 */
export function SettingsClient(): React.ReactElement {
  const { push } = useToast();
  const formId = useId();
  const assignFormId = useId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [timezone, setTimezone] = useState('Africa/Dar_es_Salaam');
  const [defaultLocale, setDefaultLocale] = useState('en');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [roles, setRoles] = useState<RoleRow[]>([]);
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

  const inviteFormId = useId();
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

  const INVITE_ROLE_OPTIONS = [
    { code: 'pastoral_leadership', label: 'Pastoral Leadership' },
    { code: 'senior_pastor', label: 'Senior Pastor' },
    { code: 'church_administrator', label: 'Church Administrator' },
    { code: 'finance_officer', label: 'Finance Officer' },
  ] as const;

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const church = await apiFetch<ChurchProfile>('/api/v1/churches/current');
      setName(church.name);
      setSlug(church.slug);
      setTimezone(church.timezone);
      setDefaultLocale(church.defaultLocale);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load church profile',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccess = useCallback(async (): Promise<void> => {
    setAccessLoading(true);
    setAccessError(null);
    try {
      const [rolesPayload, assignmentsPayload] = await Promise.all([
        apiFetch<RoleRow[] | { data: RoleRow[] }>('/api/v1/roles'),
        apiFetch<RoleAssignmentRow[] | { data: RoleAssignmentRow[] }>(
          '/api/v1/role-assignments',
        ),
      ]);
      const nextRoles = asList(rolesPayload);
      setRoles(nextRoles);
      setAssignments(asList(assignmentsPayload));
      setRoleId((prev) => prev || nextRoles[0]?.id || '');
    } catch (err) {
      setRoles([]);
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
    void load();
    void loadAccess();
  }, [load, loadAccess]);

  const roleName = (id: string): string => {
    const match = roles.find((r) => r.id === id);
    return match?.name ?? shortId(id);
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFieldErrors({});
    try {
      const updated = await apiFetch<ChurchProfile>('/api/v1/churches/current', {
        method: 'PATCH',
        json: {
          name: name.trim(),
          timezone,
          defaultLocale,
        },
      });
      setName(updated.name);
      setTimezone(updated.timezone);
      setDefaultLocale(updated.defaultLocale);
      push({ tone: 'success', message: 'Church profile saved.' });
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setFieldErrors(parsed.fieldErrors);
        push({
          tone: 'danger',
          message: parsed.formError ?? err.message,
        });
      } else {
        push({
          tone: 'danger',
          message:
            err instanceof Error ? err.message : 'Could not save profile.',
        });
      }
    } finally {
      setSaving(false);
    }
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
          phoneE164: invitePhone.trim() || undefined,
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
      setUserAccountId('');
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
      await apiFetch<{ id: string; status: string }>(
        `/api/v1/role-assignments/${assignmentId}`,
        { method: 'DELETE' },
      );
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Church profile"
        lede="Organisation name, timezone, default language, and role access for this church."
        actions={
          <Button
            type="submit"
            form={formId}
            size="sm"
            loading={saving}
            disabled={loading || Boolean(error)}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />

      {loading ? (
        <Panel title="Profile">
          <div className="flex flex-col gap-3 p-4">
            <Skeleton size="heading" />
            <Skeleton size="line" />
            <Skeleton size="line" />
          </div>
        </Panel>
      ) : error ? (
        <EmptyState
          icon="alert"
          tone="gold"
          title="Could not load church profile"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          }
        />
      ) : (
        <Panel title="Organisation">
          <form
            id={formId}
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="flex max-w-xl flex-col gap-4 p-4 sm:p-5"
          >
            <Field label="Name" required error={fieldErrors.name}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
              />
            </Field>

            <Field
              label="Slug"
              hint="URL-safe identifier. Contact platform ops to change it."
            >
              <Input value={slug} readOnly disabled />
            </Field>

            <Field label="Timezone" required error={fieldErrors.timezone}>
              <Select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {!TIMEZONES.includes(
                  timezone as (typeof TIMEZONES)[number],
                ) ? (
                  <option value={timezone}>{timezone}</option>
                ) : null}
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Default locale"
              required
              error={fieldErrors.defaultLocale}
            >
              <Select
                value={defaultLocale}
                onChange={(e) => setDefaultLocale(e.target.value)}
              >
                {LOCALES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
          </form>
        </Panel>
      )}

      {accessLoading ? (
        <Panel title="Roles / Access">
          <div className="flex flex-col gap-3 p-4">
            <Skeleton size="heading" />
            <Skeleton size="line" />
            <Skeleton size="line" />
          </div>
        </Panel>
      ) : accessError ? (
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
      ) : (
        <Panel title="Roles / Access">
          <div className="flex flex-col gap-5 p-4 sm:p-5">
            {issuedInvite ? (
              <div className="rounded-lg border border-border bg-surface p-4">
                <p className="font-medium">Leadership credentials issued (once)</p>
                <p>
                  {issuedInvite.email}
                  {issuedInvite.phoneE164
                    ? ` · ${issuedInvite.phoneE164}`
                    : ''}{' '}
                  · {issuedInvite.roleName}
                </p>
                <p>
                  PIN: <code>{issuedInvite.initialPin}</code>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  MFA OTP is required on sign-in. Share securely; PIN is not
                  stored in audit logs.
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
              <p className="text-sm text-muted-foreground">
                Invite leadership with a new login (email + PIN). Members still
                join via public registration.
              </p>
              {inviteFormError ? (
                <div
                  role="alert"
                  className="rounded-md border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--danger-ink)]"
                >
                  {inviteFormError}
                </div>
              ) : null}
              <Field
                label="Display name"
                required
                error={inviteFieldErrors.displayName}
              >
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
                  autoComplete="off"
                />
              </Field>
              <Field
                label="Phone (E.164)"
                hint="Optional"
                error={inviteFieldErrors.phoneE164}
              >
                <Input
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+2557…"
                  autoComplete="off"
                />
              </Field>
              <Field label="Role" required error={inviteFieldErrors.roleCode}>
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
              <div>
                <Button type="submit" size="sm" loading={inviting}>
                  {inviting ? 'Inviting…' : 'Invite leadership'}
                </Button>
              </div>
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
                <div
                  role="alert"
                  className="rounded-md border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--danger-ink)]"
                >
                  {assignFormError}
                </div>
              ) : null}

              <Field
                label="User account ID"
                required
                hint="UUID of an active organisation user in this church."
                error={assignFieldErrors.userAccountId}
              >
                <Input
                  value={userAccountId}
                  onChange={(e) => setUserAccountId(e.target.value.trim())}
                  placeholder="00000000-0000-4000-8000-000000000000"
                  autoComplete="off"
                />
              </Field>

              <Field label="Role" required error={assignFieldErrors.roleId}>
                <Select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  disabled={roles.length === 0}
                >
                  {roles.length === 0 ? (
                    <option value="">No roles available</option>
                  ) : null}
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} ({role.code})
                    </option>
                  ))}
                </Select>
              </Field>

              <div>
                <Button
                  type="submit"
                  size="sm"
                  loading={assigning}
                  disabled={roles.length === 0}
                >
                  {assigning ? 'Assigning…' : 'Assign role'}
                </Button>
              </div>
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
                      <TH>User account</TH>
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
                        <TD>
                          <span
                            className="font-mono text-xs text-foreground"
                            title={row.userAccountId}
                          >
                            {shortId(row.userAccountId)}
                          </span>
                        </TD>
                        <TD className="font-medium text-foreground">
                          {roleName(row.roleId)}
                        </TD>
                        <TD className="text-muted-foreground">
                          {row.scopeType.replaceAll('_', ' ')}
                        </TD>
                        <TD>
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={revokingId === row.id}
                            disabled={Boolean(revokingId)}
                            onClick={() => {
                              void handleRevoke(row.id);
                            }}
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
      )}
    </div>
  );
}
