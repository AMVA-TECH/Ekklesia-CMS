'use client';

import { FormEvent, useCallback, useState } from 'react';
import { useLoadEffect } from '@/app/_ekklesia/session';
import { humanizePlatformError, platformApi } from '../platform-api';

type DefaultsDoc = {
  modules: Record<string, boolean>;
  workflows: { announcementDualControl: boolean };
  thresholds: { adulthoodAgeYears: number };
  terminology: {
    organisationalUnitSingular: string;
    organisationalUnitPlural: string;
    membershipLabel: string;
  };
  locale: { defaultTimezone: string; defaultLocale: 'en' | 'sw' };
  templates: { suggestedIds: string[] };
};

type ConfigResponse = {
  scope: 'defaults';
  document: DefaultsDoc;
  stored: boolean;
  updatedAt: string | null;
  note?: string;
};

type TenantOverride = {
  id: string;
  churchName: string;
  updatedAt: string;
  keys: string[];
};

const MODULE_KEYS = [
  'people',
  'membership',
  'organisation',
  'events',
  'attendance',
  'finance',
  'messaging',
  'governance',
] as const;

type ChurchOption = { id: string; name: string };

export function ConfigurationClient() {
  const [doc, setDoc] = useState<DefaultsDoc | null>(null);
  const [stored, setStored] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<TenantOverride[]>([]);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [tenantChurchId, setTenantChurchId] = useState('');
  const [tenantDualControl, setTenantDualControl] = useState(true);
  const [tenantAdulthood, setTenantAdulthood] = useState(18);
  const [tenantReason, setTenantReason] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [defaults, tenants, churchRes] = await Promise.all([
      platformApi<ConfigResponse>('/api/v1/platform/config?scope=defaults'),
      platformApi<{ items: TenantOverride[] }>(
        '/api/v1/platform/config/tenants',
      ),
      platformApi<{ items: ChurchOption[] }>('/api/v1/platform/churches').catch(
        () => ({ items: [] as ChurchOption[] }),
      ),
    ]);
    setDoc(defaults.document);
    setStored(defaults.stored);
    setNote(defaults.note ?? null);
    setOverrides(tenants.items);
    setChurches(churchRes.items);
    setTenantChurchId((prev) => prev || churchRes.items[0]?.id || '');
  }, []);

  useLoadEffect(() =>
    load().catch((err: unknown) => setError(humanizePlatformError(err))),
  );

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!doc) return;
    setBusy(true);
    setError(null);
    try {
      await platformApi('/api/v1/platform/config', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'defaults',
          document: doc,
          reason: reason.trim(),
        }),
      });
      setReason('');
      await load();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSaveTenant(e: FormEvent) {
    e.preventDefault();
    if (!tenantChurchId) return;
    setBusy(true);
    setError(null);
    try {
      await platformApi('/api/v1/platform/config', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'tenant',
          churchId: tenantChurchId,
          document: {
            workflows: { announcementDualControl: tenantDualControl },
            thresholds: { adulthoodAgeYears: tenantAdulthood },
          },
          reason: tenantReason.trim(),
        }),
      });
      setTenantReason('');
      await load();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="platform-h1">Platform configuration</h1>
      <p className="platform-lead">
        Suggested defaults and templates for new tenants. Never silently
        overwrites existing church customisations.
      </p>

      {error ? <p className="platform-error">{error}</p> : null}
      {!doc && !error ? <p className="platform-muted">Loading…</p> : null}

      {doc ? (
        <form className="platform-panel" onSubmit={(e) => void onSave(e)}>
          <div className="platform-panel-head">
            <h2>Defaults layer</h2>
            <button
              type="submit"
              className="platform-btn platform-btn-primary"
              disabled={busy}
            >
              Save defaults
            </button>
          </div>
          <div style={{ padding: '1rem' }} className="space-y-4">
            {note ? <p className="text-xs platform-muted">{note}</p> : null}
            <p className="text-xs platform-muted">
              {stored ? 'Stored in platform_config.' : 'Using built-in defaults.'}
            </p>

            <fieldset className="space-y-2">
              <legend className="font-medium">Suggested modules</legend>
              <div className="flex flex-wrap gap-3">
                {MODULE_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(doc.modules[key])}
                      onChange={(e) =>
                        setDoc({
                          ...doc,
                          modules: {
                            ...doc.modules,
                            [key]: e.target.checked,
                          },
                        })
                      }
                    />
                    {key}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="font-medium">Locale &amp; thresholds</legend>
              <label className="block text-sm">
                Default timezone
                <input
                  className="platform-input w-full"
                  value={doc.locale.defaultTimezone}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      locale: {
                        ...doc.locale,
                        defaultTimezone: e.target.value,
                      },
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                Default locale
                <select
                  className="platform-input w-full"
                  value={doc.locale.defaultLocale}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      locale: {
                        ...doc.locale,
                        defaultLocale: e.target.value as 'en' | 'sw',
                      },
                    })
                  }
                >
                  <option value="sw">sw</option>
                  <option value="en">en</option>
                </select>
              </label>
              <label className="block text-sm">
                Adulthood age (years)
                <input
                  className="platform-input w-full"
                  type="number"
                  min={13}
                  max={25}
                  value={doc.thresholds.adulthoodAgeYears}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      thresholds: {
                        adulthoodAgeYears: Number(e.target.value) || 18,
                      },
                    })
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={doc.workflows.announcementDualControl}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      workflows: {
                        announcementDualControl: e.target.checked,
                      },
                    })
                  }
                />
                Announcement dual-control suggested
              </label>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="font-medium">Terminology</legend>
              {(
                [
                  ['organisationalUnitSingular', 'Unit singular'],
                  ['organisationalUnitPlural', 'Unit plural'],
                  ['membershipLabel', 'Membership label'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  {label}
                  <input
                    className="platform-input w-full"
                    value={doc.terminology[key]}
                    onChange={(e) =>
                      setDoc({
                        ...doc,
                        terminology: {
                          ...doc.terminology,
                          [key]: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              ))}
            </fieldset>

            <label className="block text-sm">
              Suggested template ids (comma-separated)
              <input
                className="platform-input w-full"
                value={doc.templates.suggestedIds.join(', ')}
                onChange={(e) =>
                  setDoc({
                    ...doc,
                    templates: {
                      suggestedIds: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  })
                }
              />
            </label>

            <label className="block text-sm">
              Reason for change
              <textarea
                className="platform-textarea w-full"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={8}
              />
            </label>
          </div>
        </form>
      ) : null}

      <form className="platform-panel" onSubmit={(e) => void onSaveTenant(e)}>
        <div className="platform-panel-head">
          <h2>Write tenant suggestion override</h2>
          <button
            type="submit"
            className="platform-btn platform-btn-primary"
            disabled={busy || !tenantChurchId}
          >
            Save tenant patch
          </button>
        </div>
        <div style={{ padding: '1rem' }} className="space-y-3">
          <p className="text-xs platform-muted">
            Sparse suggestions only — does not overwrite live church_settings.
            Church admins remain the source of truth for their tenant.
          </p>
          <label className="block text-sm">
            Church
            <select
              className="platform-input w-full"
              value={tenantChurchId}
              onChange={(e) => setTenantChurchId(e.target.value)}
              required
            >
              {churches.length === 0 ? (
                <option value="">No churches available</option>
              ) : null}
              {churches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={tenantDualControl}
              onChange={(e) => setTenantDualControl(e.target.checked)}
            />
            Suggest announcement dual-control
          </label>
          <label className="block text-sm">
            Suggested adulthood age
            <input
              className="platform-input w-full"
              type="number"
              min={13}
              max={25}
              value={tenantAdulthood}
              onChange={(e) =>
                setTenantAdulthood(Number(e.target.value) || 18)
              }
            />
          </label>
          <label className="block text-sm">
            Reason
            <textarea
              className="platform-textarea w-full"
              rows={2}
              value={tenantReason}
              onChange={(e) => setTenantReason(e.target.value)}
              required
              minLength={8}
            />
          </label>
        </div>
      </form>

      <section className="platform-panel">
        <div className="platform-panel-head">
          <h2>Tenant suggestion overrides</h2>
          <span className="platform-muted">{overrides.length} rows</span>
        </div>
        <table className="platform-table">
          <thead>
            <tr>
              <th>Church</th>
              <th>Keys</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {overrides.length === 0 ? (
              <tr>
                <td colSpan={3} className="platform-muted">
                  No tenant-layer overrides. Platform suggestions stay at
                  defaults until a church-specific patch is stored.
                </td>
              </tr>
            ) : (
              overrides.map((o) => (
                <tr key={o.id}>
                  <td>{o.churchName}</td>
                  <td className="text-xs">{o.keys.join(', ') || '—'}</td>
                  <td className="text-xs">
                    {new Date(o.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
