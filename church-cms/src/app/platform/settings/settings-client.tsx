'use client';

import { FormEvent, useCallback, useState } from 'react';
import { useLoadEffect } from '@/app/_ekklesia/session';
import { humanizePlatformError, platformApi } from '../platform-api';

type GlobalDoc = {
  identity: { productName: string; supportEmail: string };
  auth: { sessionMaxAgeHours: number; platformMfaRequired: boolean };
  security: {
    supportSessionDefaultAccess: 'read' | 'interactive';
    supportSessionMaxHours: number;
  };
  featureFlags: {
    publicChurchRegistration: boolean;
    breakGlassEnabled: boolean;
  };
  observability: { metricsSnapshotEnabled: boolean };
};

type ConfigResponse = {
  scope: 'global';
  document: GlobalDoc;
  stored: boolean;
  updatedAt: string | null;
};

export function SettingsClient() {
  const [doc, setDoc] = useState<GlobalDoc | null>(null);
  const [stored, setStored] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const res = await platformApi<ConfigResponse>(
      '/api/v1/platform/config?scope=global',
    );
    setDoc(res.document);
    setStored(res.stored);
    setUpdatedAt(res.updatedAt);
  }, []);

  useLoadEffect(() =>
    load().catch((err: unknown) => setError(humanizePlatformError(err))),
  );

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!doc) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await platformApi<{ document: GlobalDoc }>(
        '/api/v1/platform/config',
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            scope: 'global',
            document: doc,
            reason: reason.trim(),
          }),
        },
      );
      setDoc(res.document);
      setStored(true);
      setReason('');
      setSaved(true);
      await load();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="platform-h1">Platform settings</h1>
      <p className="platform-lead">
        Platform identity, session policy mirrors, and feature flags. Billing is
        deferred and not shown. MFA is never silently disabled here — the flag
        only records the intended platform policy.
      </p>

      {error ? <p className="platform-error">{error}</p> : null}
      {saved ? (
        <p className="platform-muted">Settings saved and audited.</p>
      ) : null}
      {!doc && !error ? <p className="platform-muted">Loading…</p> : null}

      {doc ? (
        <form className="platform-panel" onSubmit={(e) => void onSave(e)}>
          <div className="platform-panel-head">
            <h2>Global layer</h2>
            <button
              type="submit"
              className="platform-btn platform-btn-primary"
              disabled={busy}
            >
              Save
            </button>
          </div>
          <div style={{ padding: '1rem' }} className="space-y-4">
            <p className="text-xs platform-muted">
              {stored
                ? `Stored · updated ${updatedAt ? new Date(updatedAt).toLocaleString() : '—'}`
                : 'Using built-in defaults until first save.'}
            </p>

            <fieldset className="space-y-2">
              <legend className="font-medium">Identity</legend>
              <label className="block text-sm">
                Product name
                <input
                  className="platform-input w-full"
                  value={doc.identity.productName}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      identity: {
                        ...doc.identity,
                        productName: e.target.value,
                      },
                    })
                  }
                  required
                />
              </label>
              <label className="block text-sm">
                Support email
                <input
                  className="platform-input w-full"
                  type="email"
                  value={doc.identity.supportEmail}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      identity: {
                        ...doc.identity,
                        supportEmail: e.target.value,
                      },
                    })
                  }
                />
              </label>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="font-medium">Auth policy mirror</legend>
              <label className="block text-sm">
                Session max age (hours)
                <input
                  className="platform-input w-full"
                  type="number"
                  min={1}
                  max={720}
                  value={doc.auth.sessionMaxAgeHours}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      auth: {
                        ...doc.auth,
                        sessionMaxAgeHours: Number(e.target.value) || 168,
                      },
                    })
                  }
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={doc.auth.platformMfaRequired}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      auth: {
                        ...doc.auth,
                        platformMfaRequired: e.target.checked,
                      },
                    })
                  }
                />
                Platform MFA required (policy record only)
              </label>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="font-medium">Support sessions</legend>
              <label className="block text-sm">
                Default access level
                <select
                  className="platform-input w-full"
                  value={doc.security.supportSessionDefaultAccess}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      security: {
                        ...doc.security,
                        supportSessionDefaultAccess: e.target.value as
                          | 'read'
                          | 'interactive',
                      },
                    })
                  }
                >
                  <option value="read">read</option>
                  <option value="interactive">interactive</option>
                </select>
              </label>
              <label className="block text-sm">
                Max support session hours
                <input
                  className="platform-input w-full"
                  type="number"
                  min={1}
                  max={24}
                  value={doc.security.supportSessionMaxHours}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      security: {
                        ...doc.security,
                        supportSessionMaxHours: Number(e.target.value) || 8,
                      },
                    })
                  }
                />
              </label>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="font-medium">Feature flags</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={doc.featureFlags.publicChurchRegistration}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      featureFlags: {
                        ...doc.featureFlags,
                        publicChurchRegistration: e.target.checked,
                      },
                    })
                  }
                />
                Public church registration
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={doc.featureFlags.breakGlassEnabled}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      featureFlags: {
                        ...doc.featureFlags,
                        breakGlassEnabled: e.target.checked,
                      },
                    })
                  }
                />
                Break-glass grants enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={doc.observability.metricsSnapshotEnabled}
                  onChange={(e) =>
                    setDoc({
                      ...doc,
                      observability: {
                        metricsSnapshotEnabled: e.target.checked,
                      },
                    })
                  }
                />
                Metrics snapshots enabled
              </label>
            </fieldset>

            <label className="block text-sm">
              Reason for change
              <textarea
                className="platform-textarea w-full"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={8}
                placeholder="Why this settings change is needed"
              />
            </label>
          </div>
        </form>
      ) : null}
    </>
  );
}
