'use client';

import { useCallback, useEffect, useState } from 'react';
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
    email: string;
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
        setError(err instanceof ApiError ? err.message : 'Failed to load'),
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
      setError(err instanceof ApiError ? err.message : 'Decision failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Join requests"
        lede="People who searched for your church and asked to join. Approve to issue a member PIN."
      />

      {error ? <p className="text-destructive">{error}</p> : null}

      {issued ? (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="font-medium">Member credentials issued (once)</p>
          <p>
            {issued.email}
            {issued.phoneE164 ? ` · ${issued.phoneE164}` : ''}
          </p>
          <p>
            PIN: <code>{issued.initialPin}</code>
          </p>
          <p className="text-sm text-muted-foreground">
            Share securely. This PIN is not stored in audit logs.
          </p>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-muted-foreground">No pending join requests.</p>
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
                  {item.email ?? '—'}
                  {item.phoneE164 ? ` · ${item.phoneE164}` : ''}
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
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyId === item.id}
                  onClick={() => void decide(item.id, 'rejected')}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
