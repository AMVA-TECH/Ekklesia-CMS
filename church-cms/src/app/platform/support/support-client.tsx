'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLoadEffect } from '@/app/_ekklesia/session';
import { Button } from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../console-header';
import { humanizePlatformError, platformApi } from '../platform-api';
import { useConsoleTab } from '../use-console-tab';

type SupportCase = {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  severity: string;
  churchName: string | null;
  createdAt: string;
};

type SupportSession = {
  id: string;
  churchName: string;
  purpose: string;
  accessLevel: string;
  status: string;
  startedAt: string;
  expiresAt: string;
};

type Church = { id: string; name: string; slug: string };

const SUPPORT_TABS = ['cases', 'sessions'] as const;

export function SupportClient() {
  const [tab] = useConsoleTab(SUPPORT_TABS, 'cases');
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [churchId, setChurchId] = useState('');
  const [priority, setPriority] = useState('medium');

  const [sessionChurchId, setSessionChurchId] = useState('');
  const [sessionCaseId, setSessionCaseId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [accessLevel, setAccessLevel] = useState<'read' | 'interactive'>('read');

  const refreshCases = useCallback(async () => {
    const res = await platformApi<{ items: SupportCase[] }>(
      '/api/v1/platform/support/cases',
    );
    setCases(res.items);
  }, []);

  const refreshSessions = useCallback(async () => {
    const res = await platformApi<{ items: SupportSession[] }>(
      '/api/v1/platform/support/sessions',
    );
    setSessions(res.items);
  }, []);

  const refreshChurches = useCallback(async () => {
    const res = await platformApi<{ items: Church[] }>(
      '/api/v1/platform/churches',
    );
    setChurches(res.items);
    if (res.items[0]) {
      setChurchId((prev) => prev || res.items[0]!.id);
      setSessionChurchId((prev) => prev || res.items[0]!.id);
    }
  }, []);

  useLoadEffect(() =>
    Promise.all([refreshCases(), refreshChurches()]).catch((err: unknown) =>
      setError(humanizePlatformError(err)),
    ),
  );

  useEffect(() => {
    if (tab !== 'sessions') return;
    void refreshSessions().catch((err: unknown) =>
      setError(humanizePlatformError(err)),
    );
  }, [tab, refreshSessions]);

  async function onCreateCase(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await platformApi('/api/v1/platform/support/cases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          churchId: churchId || undefined,
        }),
      });
      setTitle('');
      setDescription('');
      await refreshCases();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function patchCaseStatus(
    id: string,
    status: 'in_progress' | 'resolved',
  ) {
    setBusy(true);
    try {
      await platformApi(`/api/v1/platform/support/cases/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await refreshCases();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onStartSession(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await platformApi('/api/v1/platform/support/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          churchId: sessionChurchId,
          purpose: purpose.trim(),
          accessLevel,
          caseId: sessionCaseId || undefined,
          expiresInMinutes: 60,
        }),
      });
      setPurpose('');
      await refreshSessions();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function revokeSession(id: string) {
    const reason = window.prompt('Reason for revoke (min 8 chars):');
    if (!reason || reason.trim().length < 8) return;
    setBusy(true);
    try {
      await platformApi(`/api/v1/platform/support/sessions/${id}/revoke`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      await refreshSessions();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ConsoleHeader
        area="support"
        tab={tab}
        title="Support centre"
        description="Cases and controlled tenant support sessions. Read access is the default; interactive is exceptional."
      />

      {error ? <p className="platform-error">{error}</p> : null}

      {tab === 'cases' ? (
        <>
          <form className="platform-panel" onSubmit={(e) => void onCreateCase(e)}>
            <div className="platform-panel-head">
              <h2>Open case</h2>
              <button
                type="submit"
                className="platform-btn platform-btn-primary"
                disabled={busy}
              >
                Create
              </button>
            </div>
            <div style={{ padding: '1rem' }} className="space-y-3">
              <input
                className="platform-input w-full"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={4}
              />
              <textarea
                className="platform-input w-full"
                placeholder="Description (optional)"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <select
                  className="platform-input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
                <select
                  className="platform-input"
                  value={churchId}
                  onChange={(e) => setChurchId(e.target.value)}
                >
                  <option value="">No church</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </form>

          <section className="platform-panel">
            <div className="platform-panel-head">
              <h2>Cases</h2>
            </div>
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Severity</th>
                  <th>Priority</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td className="text-xs">{c.caseNumber}</td>
                    <td>
                      <div>{c.title}</div>
                      {c.churchName ? (
                        <div className="platform-muted text-xs">{c.churchName}</div>
                      ) : null}
                    </td>
                    <td>{c.status}</td>
                    <td>{c.severity}</td>
                    <td>{c.priority}</td>
                    <td className="space-x-1 whitespace-nowrap">
                      {c.status === 'open' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void patchCaseStatus(c.id, 'in_progress')}
                        >
                          Acknowledge
                        </Button>
                      ) : null}
                      {c.status !== 'resolved' && c.status !== 'closed' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void patchCaseStatus(c.id, 'resolved')}
                        >
                          Resolve
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="platform-muted py-4 text-center">
                      No support cases yet. Use severity for incident-style triage.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      ) : null}

      {tab === 'sessions' ? (
        <>
          <form
            className="platform-panel"
            onSubmit={(e) => void onStartSession(e)}
          >
            <div className="platform-panel-head">
              <h2>Start support session</h2>
              <button
                type="submit"
                className="platform-btn platform-btn-primary"
                disabled={busy}
              >
                Start
              </button>
            </div>
            <div style={{ padding: '1rem' }} className="space-y-3">
              <select
                className="platform-input w-full"
                value={sessionChurchId}
                onChange={(e) => setSessionChurchId(e.target.value)}
                required
              >
                {churches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className="platform-input w-full"
                value={sessionCaseId}
                onChange={(e) => setSessionCaseId(e.target.value)}
              >
                <option value="">No case link</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber} — {c.title}
                  </option>
                ))}
              </select>
              <textarea
                className="platform-input w-full"
                placeholder="Purpose / reason"
                rows={2}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                minLength={8}
              />
              <select
                className="platform-input"
                value={accessLevel}
                onChange={(e) =>
                  setAccessLevel(e.target.value as 'read' | 'interactive')
                }
              >
                <option value="read">read (default)</option>
                <option value="interactive">interactive (exceptional)</option>
              </select>
            </div>
          </form>

          <section className="platform-panel">
            <div className="platform-panel-head">
              <h2>Sessions</h2>
            </div>
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Church</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="text-xs">
                      {new Date(s.startedAt).toLocaleString()}
                    </td>
                    <td className="text-xs">{s.churchName}</td>
                    <td>{s.accessLevel}</td>
                    <td>{s.status}</td>
                    <td className="text-xs">
                      {new Date(s.expiresAt).toLocaleString()}
                    </td>
                    <td>
                      {s.status === 'active' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void revokeSession(s.id)}
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="platform-muted py-4 text-center">
                      No support sessions yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </>
  );
}
