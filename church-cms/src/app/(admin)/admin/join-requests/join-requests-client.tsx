'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import { PageHeader, Button, StatusPill } from '@/app/_ekklesia/ui';
import { t } from '@/app/_ekklesia/i18n/core';

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
};

export function JoinRequestsClient() {
  const [items, setItems] = useState<JoinRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<DecideResult['member'] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(() => {
    apiFetch<{ items: JoinRequest[] }>('/api/v1/join-requests?status=pending')
      .then((res) => setItems(res.items))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : t('Failed to load')),
      );
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function decide(id: string, outcome: 'approved' | 'rejected') {
    setError(null);
    setIssued(null);
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
      reload();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : t('Decision failed'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Join requests')}
        lede={t('Approve to attach the person to your church and issue a member PIN for Sign in.')}
      />

      {error ? <p className="text-destructive">{error}</p> : null}

      {issued ? (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="font-medium">{t('Member credentials issued (once)')}</p>
          <p>
            {issued.phoneE164}
            {issued.email ? ` · ${issued.email}` : ''}
          </p>
          <p>
            {t('PIN:')} <code>{issued.initialPin}</code>
          </p>
          <p className="text-sm text-muted-foreground">
            {t('Share securely for Sign in (phone + PIN). Attachment unlocks this church’s services. PIN is not stored in audit logs.')}
          </p>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-muted-foreground">{t('No pending join requests.')}</p>
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
                  {item.phoneE164 ?? '—'}
                  {item.email ? ` · ${item.email}` : ''}
                </p>
                <StatusPill tone="pending">{item.status}</StatusPill>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId === item.id}
                  onClick={() => void decide(item.id, 'approved')}
                >
                  {t('Approve')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyId === item.id}
                  onClick={() => void decide(item.id, 'rejected')}
                >
                  {t('Reject')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
