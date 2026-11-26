'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLoadEffect } from '@/app/_ekklesia/session';
import { Button } from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../console-header';
import { humanizePlatformError, platformApi } from '../platform-api';
import { useConsoleTab } from '../use-console-tab';

type Finding = {
  id: string;
  severity: string;
  category: string;
  title: string;
  status: string;
  churchId: string | null;
  detectorKey: string;
  lastSeenAt: string;
};

type AccessReview = {
  id: string;
  title: string;
  scope: string;
  status: string;
  findingsSummary: string | null;
  createdAt: string;
};

type BreakGlass = {
  id: string;
  operatorEmail: string;
  reason: string;
  permissions: string[];
  status: string;
  expiresAt: string;
};

type OperatorOption = { id: string; email: string | null; status: string };

const SECURITY_TABS = ['findings', 'reviews', 'breakglass'] as const;

export function SecurityClient() {
  const [tab] = useConsoleTab(SECURITY_TABS, 'findings');
  const [items, setItems] = useState<Finding[]>([]);
  const [reviews, setReviews] = useState<AccessReview[]>([]);
  const [grants, setGrants] = useState<BreakGlass[]>([]);
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewScope, setReviewScope] = useState('platform_operators');
  const [bgEmail, setBgEmail] = useState('');
  const [bgReason, setBgReason] = useState('');
  const [bgPerm, setBgPerm] = useState('platform:impersonate_tenant');
  const [bgPin, setBgPin] = useState('');

  const loadFindings = useCallback(async () => {
    const res = await platformApi<{ items: Finding[] }>(
      '/api/v1/platform/security-findings?limit=100',
    );
    setItems(res.items);
  }, []);

  const loadReviews = useCallback(async () => {
    const res = await platformApi<{ items: AccessReview[] }>(
      '/api/v1/platform/access-reviews',
    );
    setReviews(res.items);
  }, []);

  const loadGrants = useCallback(async () => {
    const res = await platformApi<{ items: BreakGlass[] }>(
      '/api/v1/platform/break-glass',
    );
    setGrants(res.items);
  }, []);

  const loadOperators = useCallback(async () => {
    const res = await platformApi<{ items: OperatorOption[] }>(
      '/api/v1/platform/operators',
    ).catch(() => ({ items: [] as OperatorOption[] }));
    const active = res.items.filter((o) => o.status === 'active' && o.email);
    setOperators(active);
    setBgEmail((prev) => prev || active[0]?.email || '');
  }, []);

  useLoadEffect(() =>
    loadFindings().catch((err: unknown) =>
      setError(humanizePlatformError(err)),
    ),
  );

  useEffect(() => {
    if (tab === 'reviews') {
      void loadReviews().catch((err: unknown) =>
        setError(humanizePlatformError(err)),
      );
    }
    if (tab === 'breakglass') {
      void Promise.all([loadGrants(), loadOperators()]).catch((err: unknown) =>
        setError(humanizePlatformError(err)),
      );
    }
  }, [tab, loadReviews, loadGrants, loadOperators]);

  async function runDetectors() {
    setBusy(true);
    setError(null);
    try {
      await platformApi('/api/v1/platform/security-findings', { method: 'POST' });
      await loadFindings();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: 'ack' | 'resolved' | 'open') {
    setBusy(true);
    try {
      await platformApi(`/api/v1/platform/security-findings/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await loadFindings();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onCreateReview(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await platformApi('/api/v1/platform/access-reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: reviewTitle.trim(),
          scope: reviewScope,
        }),
      });
      setReviewTitle('');
      await loadReviews();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function completeReview(id: string) {
    const findingsSummary = window.prompt(
      'Findings summary (min 8 chars):',
    );
    if (!findingsSummary || findingsSummary.trim().length < 8) return;
    setBusy(true);
    try {
      await platformApi(`/api/v1/platform/access-reviews/${id}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ findingsSummary: findingsSummary.trim() }),
      });
      await loadReviews();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onCreateBreakGlass(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await platformApi('/api/v1/platform/break-glass', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operatorEmail: bgEmail.trim(),
          reason: bgReason.trim(),
          permissions: [bgPerm],
          expiresInMinutes: 60,
          pin: bgPin,
        }),
      });
      setBgReason('');
      setBgPin('');
      await loadGrants();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function revokeGrant(id: string) {
    const reason = window.prompt('Reason for revoke (min 8 chars):');
    if (!reason || reason.trim().length < 8) return;
    setBusy(true);
    try {
      await platformApi(`/api/v1/platform/break-glass/${id}/revoke`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      await loadGrants();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ConsoleHeader
        area="security"
        tab={tab}
        title="Security"
        description="Findings, access reviews, and controlled break-glass grants. Audit trails stay on the Audit page."
        actions={
          tab === 'findings' ? (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void runDetectors()}
            >
              Run detectors
            </Button>
          ) : undefined
        }
      />

      {error ? <p className="platform-error">{error}</p> : null}

      {tab === 'findings' ? (
        <>
          <div className="platform-actions">
            <button
              type="button"
              className="platform-btn platform-btn-primary"
              disabled={busy}
              onClick={() => void runDetectors()}
            >
              Run detectors
            </button>
            <button
              type="button"
              className="platform-btn"
              disabled={busy}
              onClick={() => void loadFindings()}
            >
              Refresh
            </button>
          </div>

          <section className="platform-panel">
            <div className="platform-panel-head">
              <h2>Findings queue</h2>
              <span className="platform-muted">{items.length} rows</span>
            </div>
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Detector</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="platform-muted">
                      No findings yet. Run detectors to scan.
                    </td>
                  </tr>
                ) : (
                  items.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <span className={`platform-badge ${f.severity}`}>
                          {f.severity}
                        </span>
                      </td>
                      <td>
                        <div>{f.title}</div>
                        <div className="platform-muted">{f.category}</div>
                      </td>
                      <td>{f.status}</td>
                      <td className="platform-muted">{f.detectorKey}</td>
                      <td>
                        <div className="platform-actions" style={{ margin: 0 }}>
                          <button
                            type="button"
                            className="platform-btn"
                            disabled={busy}
                            onClick={() => void setStatus(f.id, 'ack')}
                          >
                            Ack
                          </button>
                          <button
                            type="button"
                            className="platform-btn"
                            disabled={busy}
                            onClick={() => void setStatus(f.id, 'resolved')}
                          >
                            Resolve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {tab === 'reviews' ? (
        <>
          <form
            className="platform-panel"
            onSubmit={(e) => void onCreateReview(e)}
          >
            <div className="platform-panel-head">
              <h2>Start access review</h2>
              <button
                type="submit"
                className="platform-btn platform-btn-primary"
                disabled={busy}
              >
                Create
              </button>
            </div>
            <div style={{ padding: '1rem' }} className="flex flex-wrap gap-2">
              <input
                className="platform-input grow"
                placeholder="Review title"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                required
                minLength={4}
              />
              <select
                className="platform-input"
                value={reviewScope}
                onChange={(e) => setReviewScope(e.target.value)}
              >
                <option value="platform_operators">platform_operators</option>
                <option value="service_accounts">service_accounts</option>
                <option value="break_glass">break_glass</option>
                <option value="support_sessions">support_sessions</option>
              </select>
            </div>
          </form>
          <section className="platform-panel">
            <div className="platform-panel-head">
              <h2>Reviews</h2>
            </div>
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.scope}</td>
                    <td>{r.status}</td>
                    <td>
                      {r.status !== 'completed' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void completeReview(r.id)}
                        >
                          Complete
                        </Button>
                      ) : (
                        <span className="text-xs platform-muted">
                          {r.findingsSummary?.slice(0, 60)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="platform-muted py-4 text-center">
                      No access reviews yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {tab === 'breakglass' ? (
        <>
          <form
            className="platform-panel"
            onSubmit={(e) => void onCreateBreakGlass(e)}
          >
            <div className="platform-panel-head">
              <h2>Issue break-glass grant</h2>
              <button
                type="submit"
                className="platform-btn platform-btn-primary"
                disabled={busy}
              >
                Issue
              </button>
            </div>
            <div style={{ padding: '1rem' }} className="space-y-2">
              <p className="text-xs platform-muted">
                Time-limited emergency privileges merge into the operator’s
                effective platform permissions until expiry or revoke.
              </p>
              <label className="block text-sm">
                Operator
                <select
                  className="platform-input w-full"
                  value={bgEmail}
                  onChange={(e) => setBgEmail(e.target.value)}
                  required
                >
                  {operators.length === 0 ? (
                    <option value="">No operators available</option>
                  ) : null}
                  {operators.map((o) => (
                    <option key={o.id} value={o.email ?? ''}>
                      {o.email}
                    </option>
                  ))}
                </select>
              </label>
              <textarea
                className="platform-input w-full"
                placeholder="Emergency reason"
                rows={2}
                value={bgReason}
                onChange={(e) => setBgReason(e.target.value)}
                required
                minLength={12}
              />
              <select
                className="platform-input"
                value={bgPerm}
                onChange={(e) => setBgPerm(e.target.value)}
              >
                <option value="platform:impersonate_tenant">
                  platform:impersonate_tenant
                </option>
                <option value="platform:accounts_write">
                  platform:accounts_write
                </option>
                <option value="platform:operators_manage">
                  platform:operators_manage
                </option>
                <option value="platform:admin">platform:admin</option>
              </select>
              <label className="block text-sm">
                Confirm with your PIN
                <input
                  type="password"
                  inputMode="numeric"
                  className="platform-input w-full"
                  value={bgPin}
                  onChange={(e) => setBgPin(e.target.value)}
                  required
                  minLength={4}
                  maxLength={8}
                  autoComplete="current-password"
                />
              </label>
            </div>
          </form>
          <section className="platform-panel">
            <div className="platform-panel-head">
              <h2>Grants</h2>
            </div>
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Operator</th>
                  <th>Status</th>
                  <th>Permissions</th>
                  <th>Expires</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id}>
                    <td className="text-xs">{g.operatorEmail}</td>
                    <td>{g.status}</td>
                    <td className="text-xs">
                      {(g.permissions ?? []).join(', ')}
                    </td>
                    <td className="text-xs">
                      {new Date(g.expiresAt).toLocaleString()}
                    </td>
                    <td>
                      {g.status === 'active' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void revokeGrant(g.id)}
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {grants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="platform-muted py-4 text-center">
                      No break-glass grants.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}
