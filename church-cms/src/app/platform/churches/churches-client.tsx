'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Icon } from '@/app/_ekklesia/icons';
import {
  Button,
  Dialog,
  DialogFooter,
} from '@/app/_ekklesia/ui';
import {
  TANZANIA_PHONE_EXAMPLE_LOCAL,
  TANZANIA_PHONE_HINT,
  TANZANIA_PHONE_INVALID_MESSAGE,
  normalizeTanzaniaPhoneE164,
} from '@/platform/phone';
import {
  humanizePlatformError,
  platformApi,
  platformFieldErrorsFromApi,
} from '../platform-api';

type Church = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  defaultLocale: string;
  createdAt: string;
};

type CreatedChurchResponse = {
  church: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    defaultLocale: string;
  };
  admin: {
    userAccountId: string;
    personId: string;
    displayName: string;
    email: string;
    phoneE164: string | null;
    initialPin: string;
    mfaRequired: boolean;
  };
};

type CreateFieldKey =
  | 'name'
  | 'slug'
  | 'timezone'
  | 'adminName'
  | 'adminEmail'
  | 'adminPhone'
  | 'adminPin';

type EnterFieldKey = 'church' | 'reason';

function mapApiFieldsToCreate(
  apiFields: Record<string, string>,
): Partial<Record<CreateFieldKey, string>> {
  const next: Partial<Record<CreateFieldKey, string>> = {};
  if (apiFields.name) next.name = apiFields.name;
  if (apiFields.slug) next.slug = apiFields.slug;
  if (apiFields.timezone) next.timezone = apiFields.timezone;
  if (apiFields['admin.displayName']) {
    next.adminName = apiFields['admin.displayName'];
  }
  if (apiFields['admin.email']) next.adminEmail = apiFields['admin.email'];
  if (apiFields['admin.phoneE164']) {
    next.adminPhone = apiFields['admin.phoneE164'];
  }
  if (apiFields['admin.pin']) next.adminPin = apiFields['admin.pin'];
  return next;
}

export function ChurchesClient() {
  const [items, setItems] = useState<Church[]>([]);
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [entering, setEntering] = useState(false);
  const [issuedCreds, setIssuedCreds] = useState<
    CreatedChurchResponse['admin'] | null
  >(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [timezone, setTimezone] = useState('Africa/Dar_es_Salaam');
  const [locale, setLocale] = useState<'en' | 'sw'>('sw');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPin, setAdminPin] = useState('');

  const [createFieldErrors, setCreateFieldErrors] = useState<
    Partial<Record<CreateFieldKey, string>>
  >({});
  const [enterFieldErrors, setEnterFieldErrors] = useState<
    Partial<Record<EnterFieldKey, string>>
  >({});

  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [failureOpen, setFailureOpen] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [failureTitle, setFailureTitle] = useState('Request failed');

  const reload = useCallback(() => {
    platformApi<{ items: Church[] }>('/api/v1/platform/churches')
      .then((res) => {
        setItems(res.items);
        setLoadError(null);
        if (res.items[0]) setSelected((prev) => prev || res.items[0]!.id);
      })
      .catch((err: unknown) =>
        setLoadError(humanizePlatformError(err)),
      );
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  function validateCreate(): boolean {
    const next: Partial<Record<CreateFieldKey, string>> = {};
    if (name.trim().length < 2) {
      next.name = 'Enter the church’s full name (at least 2 characters).';
    }
    if (slug.trim()) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim().toLowerCase())) {
        next.slug =
          'Use a simple web address slug like “hope-church” (lowercase, hyphens only).';
      }
    }
    if (timezone.trim().length < 3) {
      next.timezone = 'Choose a timezone, e.g. Africa/Dar_es_Salaam.';
    }
    if (adminName.trim().length < 2) {
      next.adminName = 'Enter the first admin’s name.';
    }
    if (!adminEmail.trim()) {
      next.adminEmail = 'Enter the first admin’s email so they can sign in.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
      next.adminEmail = 'That email does not look right. Check for typos.';
    }
    if (adminPhone.trim() && !normalizeTanzaniaPhoneE164(adminPhone.trim())) {
      next.adminPhone = TANZANIA_PHONE_INVALID_MESSAGE;
    }
    if (!/^\d{4,8}$/.test(adminPin.trim())) {
      next.adminPin = 'Choose a PIN of 4 to 8 digits for the first admin.';
    }
    setCreateFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateEnter(): boolean {
    const next: Partial<Record<EnterFieldKey, string>> = {};
    if (!selected) next.church = 'Choose which church you are entering.';
    if (reason.trim().length < 8) {
      next.reason =
        'Write a short note (at least 8 characters) explaining why you need access.';
    }
    setEnterFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function showFailure(title: string, message: string): void {
    setFailureTitle(title);
    setFailureMessage(message);
    setFailureOpen(true);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setFailureOpen(false);
    setSuccessOpen(false);
    setIssuedCreds(null);
    if (!validateCreate()) return;

    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        timezone: timezone.trim(),
        defaultLocale: locale,
        admin: {
          displayName: adminName.trim(),
          email: adminEmail.trim(),
          pin: adminPin.trim(),
          ...(adminPhone.trim()
            ? { phoneE164: normalizeTanzaniaPhoneE164(adminPhone.trim())! }
            : {}),
        },
      };
      if (slug.trim()) body.slug = slug.trim().toLowerCase();

      const res = await platformApi<CreatedChurchResponse>(
        '/api/v1/platform/churches',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      setIssuedCreds(res.admin);
      setSuccessMessage(
        `Created ${res.church.name} (${res.church.slug}). Copy the admin PIN now — it will not be shown again.`,
      );
      setSuccessOpen(true);
      setName('');
      setSlug('');
      setAdminName('');
      setAdminEmail('');
      setAdminPhone('');
      setAdminPin('');
      setCreateFieldErrors({});
      reload();
      setSelected(res.church.id);
    } catch (err: unknown) {
      const apiFields = platformFieldErrorsFromApi(err);
      if (Object.keys(apiFields).length > 0) {
        setCreateFieldErrors(mapApiFieldsToCreate(apiFields));
      }
      showFailure('Could not create church', humanizePlatformError(err));
    } finally {
      setCreating(false);
    }
  }

  async function onEnter(e: FormEvent) {
    e.preventDefault();
    setFailureOpen(false);
    if (!validateEnter()) return;

    setEntering(true);
    try {
      const res = await platformApi<{
        churchId: string;
        churchName: string;
        reason: string;
        devHint?: Record<string, string>;
      }>(`/api/v1/platform/tenants/${selected}/enter`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setSuccessMessage(
        `Entered ${res.churchName}. Reason recorded.${
          res.devHint
            ? ` Dev headers: ${JSON.stringify(res.devHint)}`
            : ''
        }`,
      );
      setSuccessOpen(true);
      setReason('');
      setEnterFieldErrors({});
    } catch (err: unknown) {
      showFailure('Could not enter church', humanizePlatformError(err));
    } finally {
      setEntering(false);
    }
  }

  return (
    <>
      <h1 className="platform-h1">Churches</h1>
      <p className="platform-lead">
        Create tenants and issue the first church administrator credentials
        (DEC-032). Enter a church with a written reason for support — every
        entry is audited.
      </p>

      {loadError ? (
        <div className="platform-status platform-status-danger" role="alert">
          <span className="platform-status-icon">
            <Icon name="alert-circle" size={22} />
          </span>
          <div>
            <strong>Could not load churches</strong>
            <p>{loadError}</p>
          </div>
        </div>
      ) : null}

      {issuedCreds && !successOpen ? (
        <div className="platform-status platform-status-success" role="status">
          <span className="platform-status-icon">
            <Icon name="check-circle" size={22} />
          </span>
          <div>
            <strong>Admin credentials issued (once)</strong>
            <p>
              {issuedCreds.displayName} · {issuedCreds.email}
              {issuedCreds.phoneE164 ? ` · ${issuedCreds.phoneE164}` : ''}
            </p>
            <p>
              Initial PIN: <code>{issuedCreds.initialPin}</code>
            </p>
            <p>
              MFA OTP is required on first admin sign-in. Share securely; PIN is
              not stored in audit logs.
            </p>
          </div>
        </div>
      ) : null}

      <form className="platform-panel" onSubmit={(e) => void onCreate(e)} noValidate>
        <div className="platform-panel-head">
          <h2>Create church</h2>
          <button
            type="submit"
            className="platform-btn platform-btn-primary"
            disabled={creating}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
        <div style={{ padding: '1rem' }} className="platform-form-row two">
          <div>
            <label className="platform-muted" htmlFor="name">
              Church name
            </label>
            <input
              id="name"
              className={`platform-input${createFieldErrors.name ? ' is-invalid' : ''}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setCreateFieldErrors((f) => ({ ...f, name: undefined }));
              }}
              minLength={2}
            />
            {createFieldErrors.name ? (
              <span className="platform-field-error">{createFieldErrors.name}</span>
            ) : null}
          </div>
          <div>
            <label className="platform-muted" htmlFor="slug">
              Slug (optional)
            </label>
            <input
              id="slug"
              className={`platform-input${createFieldErrors.slug ? ' is-invalid' : ''}`}
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setCreateFieldErrors((f) => ({ ...f, slug: undefined }));
              }}
              placeholder="auto from name"
            />
            {createFieldErrors.slug ? (
              <span className="platform-field-error">{createFieldErrors.slug}</span>
            ) : null}
          </div>
          <div>
            <label className="platform-muted" htmlFor="timezone">
              Timezone
            </label>
            <input
              id="timezone"
              className={`platform-input${createFieldErrors.timezone ? ' is-invalid' : ''}`}
              value={timezone}
              onChange={(e) => {
                setTimezone(e.target.value);
                setCreateFieldErrors((f) => ({ ...f, timezone: undefined }));
              }}
            />
            {createFieldErrors.timezone ? (
              <span className="platform-field-error">
                {createFieldErrors.timezone}
              </span>
            ) : null}
          </div>
          <div>
            <label className="platform-muted" htmlFor="locale">
              Default locale
            </label>
            <select
              id="locale"
              className="platform-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'en' | 'sw')}
            >
              <option value="sw">sw</option>
              <option value="en">en</option>
            </select>
          </div>
          <div>
            <label className="platform-muted" htmlFor="adminName">
              Admin display name
            </label>
            <input
              id="adminName"
              className={`platform-input${createFieldErrors.adminName ? ' is-invalid' : ''}`}
              value={adminName}
              onChange={(e) => {
                setAdminName(e.target.value);
                setCreateFieldErrors((f) => ({ ...f, adminName: undefined }));
              }}
              minLength={2}
            />
            {createFieldErrors.adminName ? (
              <span className="platform-field-error">
                {createFieldErrors.adminName}
              </span>
            ) : null}
          </div>
          <div>
            <label className="platform-muted" htmlFor="adminEmail">
              Admin email
            </label>
            <input
              id="adminEmail"
              type="email"
              className={`platform-input${createFieldErrors.adminEmail ? ' is-invalid' : ''}`}
              value={adminEmail}
              onChange={(e) => {
                setAdminEmail(e.target.value);
                setCreateFieldErrors((f) => ({ ...f, adminEmail: undefined }));
              }}
            />
            {createFieldErrors.adminEmail ? (
              <span className="platform-field-error">
                {createFieldErrors.adminEmail}
              </span>
            ) : null}
          </div>
          <div>
            <label className="platform-muted" htmlFor="adminPhone">
              Admin phone (optional)
            </label>
            <input
              id="adminPhone"
              className={`platform-input${createFieldErrors.adminPhone ? ' is-invalid' : ''}`}
              value={adminPhone}
              onChange={(e) => {
                setAdminPhone(e.target.value);
                setCreateFieldErrors((f) => ({ ...f, adminPhone: undefined }));
              }}
              placeholder={TANZANIA_PHONE_EXAMPLE_LOCAL}
            />
            <span className="platform-muted">{TANZANIA_PHONE_HINT}</span>
            {createFieldErrors.adminPhone ? (
              <span className="platform-field-error">
                {createFieldErrors.adminPhone}
              </span>
            ) : null}
          </div>
          <div>
            <label className="platform-muted" htmlFor="adminPin">
              Initial PIN (4–8 digits)
            </label>
            <input
              id="adminPin"
              className={`platform-input${createFieldErrors.adminPin ? ' is-invalid' : ''}`}
              value={adminPin}
              onChange={(e) => {
                setAdminPin(e.target.value.replace(/[^\d]/g, '').slice(0, 8));
                setCreateFieldErrors((f) => ({ ...f, adminPin: undefined }));
              }}
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
            />
            {createFieldErrors.adminPin ? (
              <span className="platform-field-error">
                {createFieldErrors.adminPin}
              </span>
            ) : null}
          </div>
        </div>
      </form>

      <section className="platform-panel">
        <div className="platform-panel-head">
          <h2>Inventory</h2>
          <span className="platform-muted">{items.length} churches</span>
        </div>
        <table className="platform-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Timezone</th>
              <th>Locale</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="platform-muted">{c.slug}</td>
                <td>{c.timezone}</td>
                <td>{c.defaultLocale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form className="platform-panel" onSubmit={(e) => void onEnter(e)} noValidate>
        <div className="platform-panel-head">
          <h2>Enter tenant (support)</h2>
          <button
            type="submit"
            className="platform-btn platform-btn-primary"
            disabled={entering || items.length === 0}
          >
            {entering ? 'Entering…' : 'Enter'}
          </button>
        </div>
        <div style={{ padding: '1rem' }} className="platform-form-row two">
          <div>
            <label className="platform-muted" htmlFor="church">
              Church
            </label>
            <select
              id="church"
              className={`platform-select${enterFieldErrors.church ? ' is-invalid' : ''}`}
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setEnterFieldErrors((f) => ({ ...f, church: undefined }));
              }}
            >
              {items.length === 0 ? (
                <option value="">No churches yet</option>
              ) : null}
              {items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {enterFieldErrors.church ? (
              <span className="platform-field-error">
                {enterFieldErrors.church}
              </span>
            ) : null}
          </div>
          <div>
            <label className="platform-muted" htmlFor="reason">
              Reason (min 8 characters)
            </label>
            <textarea
              id="reason"
              className={`platform-textarea${enterFieldErrors.reason ? ' is-invalid' : ''}`}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setEnterFieldErrors((f) => ({ ...f, reason: undefined }));
              }}
              placeholder="Investigating failed message job #…"
            />
            {enterFieldErrors.reason ? (
              <span className="platform-field-error">
                {enterFieldErrors.reason}
              </span>
            ) : null}
          </div>
        </div>
      </form>

      <Dialog
        open={successOpen && Boolean(successMessage)}
        onClose={() => setSuccessOpen(false)}
        title="Success"
        description="The platform action completed."
        size="sm"
        hideCloseButton
        footer={
          <DialogFooter>
            <Button data-autofocus onClick={() => setSuccessOpen(false)}>
              Continue
            </Button>
          </DialogFooter>
        }
      >
        <div className="flex flex-col items-center rounded-2xl border-2 border-[color:var(--success)] bg-[color:var(--success-soft)] px-4 py-5 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--success)] text-white shadow-sm">
            <Icon name="check-circle" size={36} />
          </span>
          <p className="mt-3 text-base font-semibold text-[color:var(--success-ink)]">
            Success
          </p>
          <p className="mt-1 text-[color:var(--success-ink)] opacity-90">
            {successMessage}
          </p>
          {issuedCreds ? (
            <p className="mt-3 font-mono text-sm text-[color:var(--success-ink)]">
              PIN: {issuedCreds.initialPin}
            </p>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={failureOpen && Boolean(failureMessage)}
        onClose={() => setFailureOpen(false)}
        title={failureTitle}
        description="Fix the issue and try again."
        size="sm"
        hideCloseButton
        footer={
          <DialogFooter>
            <Button data-autofocus onClick={() => setFailureOpen(false)}>
              Try again
            </Button>
          </DialogFooter>
        }
      >
        <div className="flex flex-col items-center rounded-2xl border-2 border-[color:var(--danger)] bg-[color:var(--danger-soft)] px-4 py-5 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--danger)] text-white shadow-sm">
            <Icon name="alert-circle" size={36} />
          </span>
          <p className="mt-3 text-base font-semibold text-[color:var(--danger-ink)]">
            Failed
          </p>
          <p className="mt-1 text-[color:var(--danger-ink)] opacity-90">
            {failureMessage}
          </p>
        </div>
      </Dialog>
    </>
  );
}
