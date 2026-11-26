'use client';

import { FormEvent, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoadEffect } from '@/app/_ekklesia/session';
import { Button, Panel } from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../../console-header';
import { humanizePlatformError, platformApi } from '../../platform-api';

type Church = { id: string; name: string; slug: string };

const SERVICES = [
  { value: 'messaging', label: 'Messaging (SMS and email)' },
  { value: 'identity', label: 'Sign-in and codes' },
  { value: 'finance', label: 'Finance integrations' },
  { value: 'storage', label: 'Files and storage' },
  { value: 'platform', label: 'Whole platform' },
  { value: 'other', label: 'Other' },
] as const;

export function NewIncidentClient() {
  const router = useRouter();
  const [churches, setChurches] = useState<Church[]>([]);
  const [service, setService] = useState<(typeof SERVICES)[number]['value']>(
    'platform',
  );
  const [severity, setSeverity] = useState<
    'low' | 'medium' | 'high' | 'critical'
  >('medium');
  const [priority, setPriority] = useState<
    'low' | 'medium' | 'high' | 'urgent'
  >('medium');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [churchId, setChurchId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useLoadEffect(
    useCallback(() => {
      platformApi<{ items: Church[] }>('/api/v1/platform/churches?limit=100')
        .then((res) => setChurches(res.items))
        .catch(() => {
          /* optional — church link not required */
        });
    }, []),
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const serviceLabel =
        SERVICES.find((s) => s.value === service)?.label ?? service;
      await platformApi('/api/v1/platform/support/cases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: `[${serviceLabel}] ${summary.trim()}`.slice(0, 200),
          description: details.trim() || undefined,
          severity,
          priority,
          churchId: churchId || undefined,
        }),
      });
      router.push('/platform/incidents');
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <ConsoleHeader
        area="incidents"
        tab="new"
        title="Report incident"
        description="Record a problem Ekklesia did not detect itself. It joins the incident queue and follows the same acknowledge and resolve steps."
      />

      {error ? <p className="platform-error">{error}</p> : null}

      <div className="max-w-2xl">
        <Panel title="What is happening?">
          <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <label className="block text-sm">
              <span className="text-muted-foreground">Affected area</span>
              <select
                className="platform-select mt-1"
                value={service}
                onChange={(e) =>
                  setService(e.target.value as typeof service)
                }
              >
                {SERVICES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted-foreground">Severity</span>
                <select
                  className="platform-select mt-1"
                  value={severity}
                  onChange={(e) =>
                    setSeverity(e.target.value as typeof severity)
                  }
                >
                  <option value="low">Info / low</option>
                  <option value="medium">Warning / medium</option>
                  <option value="high">Error / high</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Priority</span>
                <select
                  className="platform-select mt-1"
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as typeof priority)
                  }
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-muted-foreground">Summary</span>
              <input
                className="platform-input mt-1"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
                minLength={4}
                maxLength={160}
                placeholder="For example, churches in Dar report SMS codes are not arriving"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Notes</span>
              <textarea
                className="platform-textarea mt-1"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Who reported it, when it started, what was tried. No passwords, PINs or codes."
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">
                Related church (optional)
              </span>
              <select
                className="platform-select mt-1"
                value={churchId}
                onChange={(e) => setChurchId(e.target.value)}
              >
                <option value="">Platform-wide</option>
                {churches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={busy}>
              Report incident
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
