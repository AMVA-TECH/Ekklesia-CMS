'use client';

import { FormEvent, useCallback, useState } from 'react';
import { useLoadEffect } from '@/app/_ekklesia/session';
import {
  Button,
  EmptyState,
  Panel,
  Skeleton,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../../console-header';
import { humanizePlatformError, platformApi } from '../../platform-api';

type Channel = 'sms' | 'email';

type Overview = {
  notify: {
    provider: string;
    configured: boolean;
    testRecipients: string | null;
    emailConfigured?: boolean;
    emailTestRecipients?: string | null;
  };
};

export function TestingClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<Channel>('sms');
  const [to, setTo] = useState('');
  const [body, setBody] = useState('');
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Array<{
      at: string;
      channel: Channel;
      ok: boolean;
      to: string;
      providerRef: string | null;
      error: string | null;
    }>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi<Overview>('/api/v1/platform/messaging');
      setOverview(res);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useLoadEffect(load);

  async function onTest(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTestResult(null);
    setError(null);
    try {
      const payload: {
        channel: Channel;
        to: string;
        reason: string;
        pin: string;
        body?: string;
      } = {
        channel,
        to: to.trim(),
        reason: reason.trim(),
        pin,
      };
      if (body.trim()) payload.body = body.trim();

      const res = await platformApi<{
        ok: boolean;
        providerRef: string | null;
        error: string | null;
      }>('/api/v1/platform/messaging/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const line = res.ok
        ? `Sent (${channel}) · provider ref ${res.providerRef ?? 'n/a'}`
        : `Failed · ${res.error ?? 'unknown'}`;
      setTestResult(line);
      setHistory((prev) =>
        [
          {
            at: new Date().toISOString(),
            channel,
            ok: res.ok,
            to: to.trim(),
            providerRef: res.providerRef,
            error: res.error,
          },
          ...prev,
        ].slice(0, 20),
      );
      setPin('');
      await load();
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <ConsoleHeader
        area="messaging"
        tab="testing"
        title="Testing"
        description="Prove each channel works: send a PIN-gated test SMS or email to your own phone or inbox. Secrets stay in env."
      />

      {error ? <p className="platform-error">{error}</p> : null}
      {testResult ? (
        <p className="rounded-card bg-[color:var(--sage-soft)] px-4 py-3 text-sm text-[color:var(--sage-ink)]">
          {testResult}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Send a test"
          subtitle="Goes straight to the provider · PIN step-up"
        >
          <form className="space-y-3" onSubmit={(e) => void onTest(e)}>
            <label className="block text-sm">
              <span className="text-muted-foreground">Channel</span>
              <select
                className="platform-select mt-1"
                value={channel}
                onChange={(e) => {
                  setChannel(e.target.value as Channel);
                  setTo('');
                }}
              >
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">
                {channel === 'sms'
                  ? 'Phone number'
                  : 'Email address'}
              </span>
              <input
                className="platform-input mt-1"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
                autoComplete="off"
                inputMode={channel === 'sms' ? 'tel' : 'email'}
                type={channel === 'email' ? 'email' : 'text'}
                placeholder={
                  channel === 'sms'
                    ? '0712 345 678 or +255…'
                    : 'you@example.com'
                }
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">
                Message{' '}
                <span className="text-xs">(optional)</span>
              </span>
              <textarea
                className="platform-textarea mt-1"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Leave blank for the standard test text. Up to 300 characters."
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Reason</span>
              <input
                className="platform-input mt-1"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={8}
                placeholder="Verifying delivery after provider rotate"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Your PIN</span>
              <input
                type="password"
                inputMode="numeric"
                className="platform-input mt-1"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                minLength={4}
                maxLength={8}
                autoComplete="current-password"
              />
            </label>
            <Button type="submit" size="sm" disabled={busy}>
              Send test
            </Button>
            <p className="text-xs text-muted-foreground">
              {channel === 'sms'
                ? 'SMS_TEST_RECIPIENTS must include the number (or *).'
                : 'EMAIL_TEST_RECIPIENTS must include the address (or *). Uses AUTH_SMTP_*.'}
            </p>
          </form>
        </Panel>

        <Panel title="Connection" subtitle="Configured providers (no secrets)">
          {loading || !overview ? (
            <Skeleton className="h-32 rounded-card" />
          ) : (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-2 border-b border-border pb-2">
                <dt className="text-muted-foreground">SMS provider</dt>
                <dd className="font-medium">{overview.notify.provider}</dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-2">
                <dt className="text-muted-foreground">SMS configured</dt>
                <dd className="font-medium">
                  {overview.notify.configured ? 'Yes' : 'Stub / not set'}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-2">
                <dt className="text-muted-foreground">SMS allow-list</dt>
                <dd className="max-w-[14rem] truncate font-mono text-xs">
                  {overview.notify.testRecipients ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-b border-border pb-2">
                <dt className="text-muted-foreground">Email (SMTP)</dt>
                <dd className="font-medium">
                  {overview.notify.emailConfigured ? 'Configured' : 'Not set'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Email allow-list</dt>
                <dd className="max-w-[14rem] truncate font-mono text-xs">
                  {overview.notify.emailTestRecipients ?? '—'}
                </dd>
              </div>
            </dl>
          )}
        </Panel>
      </div>

      <Panel
        title="This session’s tests"
        subtitle="Masked in audit; shown once here"
        flush
      >
        {history.length === 0 ? (
          <EmptyState
            icon="chat"
            tone="sky"
            title="No test messages yet"
            description="Send a test to confirm SMS or email can deliver."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Sent</TH>
                  <TH>Channel</TH>
                  <TH>Recipient</TH>
                  <TH>Result</TH>
                  <TH>Provider ref</TH>
                </TR>
              </THead>
              <TBody>
                {history.map((row, i) => (
                  <TR key={`${row.at}-${i}`}>
                    <TD className="text-muted-foreground">
                      {new Date(row.at).toLocaleString()}
                    </TD>
                    <TD>{row.channel}</TD>
                    <TD className="font-mono text-xs">{row.to}</TD>
                    <TD>{row.ok ? 'ok' : row.error ?? 'failed'}</TD>
                    <TD className="font-mono text-xs">
                      {row.providerRef ?? '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
