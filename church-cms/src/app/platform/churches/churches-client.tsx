'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { platformApi } from '../platform-api';

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

export function ChurchesClient() {
  const [items, setItems] = useState<Church[]>([]);
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [issuedCreds, setIssuedCreds] = useState<CreatedChurchResponse['admin'] | null>(
    null,
  );

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [timezone, setTimezone] = useState('Africa/Dar_es_Salaam');
  const [locale, setLocale] = useState<'en' | 'sw'>('sw');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPin, setAdminPin] = useState('');

  const reload = useCallback(() => {
    platformApi<{ items: Church[] }>('/api/v1/platform/churches')
      .then((res) => {
        setItems(res.items);
        if (res.items[0]) setSelected((prev) => prev || res.items[0]!.id);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed'),
      );
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIssuedCreds(null);
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name,
        timezone,
        defaultLocale: locale,
        admin: {
          displayName: adminName,
          email: adminEmail,
          pin: adminPin,
          ...(adminPhone.trim() ? { phoneE164: adminPhone.trim() } : {}),
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
      setMessage(
        `Created ${res.church.name} (${res.church.slug}). Copy the admin PIN now — it will not be shown again.`,
      );
      setName('');
      setSlug('');
      setAdminName('');
      setAdminEmail('');
      setAdminPhone('');
      setAdminPin('');
      reload();
      setSelected(res.church.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setCreating(false);
    }
  }

  async function onEnter(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await platformApi<{
        churchId: string;
        churchName: string;
        reason: string;
        devHint?: Record<string, string>;
      }>(`/api/v1/platform/tenants/${selected}/enter`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      setMessage(
        `Entered ${res.churchName}. Reason recorded. Dev headers: ${JSON.stringify(res.devHint ?? {})}`,
      );
      setReason('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
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

      {error ? <p className="platform-error">{error}</p> : null}
      {message ? <p className="platform-muted">{message}</p> : null}

      {issuedCreds ? (
        <section className="platform-panel">
          <div className="platform-panel-head">
            <h2>Issued admin credentials (once)</h2>
          </div>
          <div style={{ padding: '1rem' }}>
            <p>
              <strong>{issuedCreds.displayName}</strong> · {issuedCreds.email}
              {issuedCreds.phoneE164 ? ` · ${issuedCreds.phoneE164}` : ''}
            </p>
            <p>
              Initial PIN: <code>{issuedCreds.initialPin}</code>
            </p>
            <p className="platform-muted">
              MFA OTP is required on first admin sign-in. Share these details
              securely; they are not stored in audit logs.
            </p>
          </div>
        </section>
      ) : null}

      <form className="platform-panel" onSubmit={(e) => void onCreate(e)}>
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
        <div style={{ padding: '1rem' }} className="platform-form-row">
          <div>
            <label className="platform-muted" htmlFor="name">
              Church name
            </label>
            <input
              id="name"
              className="platform-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="platform-muted" htmlFor="slug">
              Slug (optional)
            </label>
            <input
              id="slug"
              className="platform-input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto from name"
            />
          </div>
          <div>
            <label className="platform-muted" htmlFor="timezone">
              Timezone
            </label>
            <input
              id="timezone"
              className="platform-input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
            />
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
              className="platform-input"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="platform-muted" htmlFor="adminEmail">
              Admin email
            </label>
            <input
              id="adminEmail"
              type="email"
              className="platform-input"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="platform-muted" htmlFor="adminPhone">
              Admin phone (E.164, optional)
            </label>
            <input
              id="adminPhone"
              className="platform-input"
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              placeholder="+2557…"
            />
          </div>
          <div>
            <label className="platform-muted" htmlFor="adminPin">
              Initial PIN (4–8 digits)
            </label>
            <input
              id="adminPin"
              className="platform-input"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              required
              pattern="\d{4,8}"
              inputMode="numeric"
              autoComplete="off"
            />
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

      <form className="platform-panel" onSubmit={(e) => void onEnter(e)}>
        <div className="platform-panel-head">
          <h2>Enter tenant (support)</h2>
          <button type="submit" className="platform-btn platform-btn-primary">
            Enter
          </button>
        </div>
        <div style={{ padding: '1rem' }} className="platform-form-row">
          <div>
            <label className="platform-muted" htmlFor="church">
              Church
            </label>
            <select
              id="church"
              className="platform-select"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              required
            >
              {items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="platform-muted" htmlFor="reason">
              Reason (min 8 characters)
            </label>
            <textarea
              id="reason"
              className="platform-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={8}
              placeholder="Investigating failed message job #…"
            />
          </div>
        </div>
      </form>
    </>
  );
}
