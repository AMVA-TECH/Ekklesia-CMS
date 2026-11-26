'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import { PageHeader, Button, StatusPill } from '@/app/_ekklesia/ui';

type JoinRequest = {
  id: string;
  displayName: string;
  email: string | null;
  phoneE164: string | null;
  preferredLocale: string;
  status: string;
  createdAt: string;
};

type DecideResult = {
  id: string;
  status: string;
  member?: {
    email: string | null;
    phoneE164: string | null;
    initialPin: string;
  };
  notify?: {
    sms: 'sent' | 'skipped' | 'failed';
    email: 'sent' | 'skipped' | 'failed';
    detail: string | null;
  };
};

export function JoinRequestsClient() {
  const t = useTranslations('AdminPages');
  const tj = useTranslations('AdminJoinRequests');
  const [items, setItems] = useState<JoinRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<DecideResult['member'] | null>(null);
  const [notify, setNotify] = useState<DecideResult['notify'] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(() => {
    apiFetch<{ items: JoinRequest[] }>('/api/v1/join-requests?status=pending')
      .then((res) => setItems(res.items))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : tj('failedToLoad')),
      );
  }, [tj]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function decide(id: string, outcome: 'approved' | 'rejected') {
    setError(null);
    setIssued(null);
    setNotify(null);
    setCopied(false);
    setBusyId(id);
    try {
      const res = await apiFetch<DecideResult>(
        `/api/v1/join-requests/${id}/decision`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ outcome }),
        },
      );
      if (res.member) setIssued(res.member);
      if (res.notify) setNotify(res.notify);
      reload();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : tj('decisionFailed'));
    } finally {
      setBusyId(null);
    }
  }

  async function copyPin(): Promise<void> {
    if (!issued?.initialPin) return;
    try {
      await navigator.clipboard.writeText(issued.initialPin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  const notifyOk =
    notify &&
    (notify.sms === 'sent' || notify.email === 'sent') &&
    notify.sms !== 'failed' &&
    notify.email !== 'failed';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('joinRequests')}
        lede={t('joinRequestsLede')}
      />

      {error ? <p className="text-destructive">{error}</p> : null}

      {issued ? (
        <div className="rounded-lg border border-border bg-surface p-4 space-y-2">
          <p className="font-medium">{tj('credentialsIssued')}</p>
          <p>
            {issued.phoneE164}
            {issued.email ? ` · ${issued.email}` : ''}
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <span>
              {tj('pinLabel')} <code>{issued.initialPin}</code>
            </span>
            <Button type="button" size="sm" variant="secondary" onClick={() => void copyPin()}>
              {copied ? tj('copied') : tj('copyPin')}
            </Button>
          </p>
          <p className="text-sm text-muted-foreground">
            {tj('credentialsHint')}
          </p>
          {notify ? (
            <p className="text-sm text-muted-foreground">
              {notifyOk
                ? tj('credentialsNotifyOk')
                : tj('credentialsNotifyPartial', {
                    detail:
                      notify.detail ||
                      `sms=${notify.sms}, email=${notify.email}`,
                  })}
            </p>
          ) : null}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-muted-foreground">{tj('noPending')}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <div>
                <p className="font-medium">{item.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {item.phoneE164 ?? tj('dash')}
                  {item.email ? ` · ${item.email}` : ''}
                </p>
                <StatusPill tone="pending">
                  {item.status === 'pending'
                    ? tj('statusPending')
                    : item.status === 'approved'
                      ? tj('statusApproved')
                      : item.status === 'rejected'
                        ? tj('statusRejected')
                        : item.status}
                </StatusPill>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId === item.id}
                  onClick={() => void decide(item.id, 'approved')}
                >
                  {tj('approve')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyId === item.id}
                  onClick={() => void decide(item.id, 'rejected')}
                >
                  {tj('reject')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
