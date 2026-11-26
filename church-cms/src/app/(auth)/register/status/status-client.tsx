'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Icon } from '@/app/_ekklesia/icons';
import { Button, Skeleton } from '@/app/_ekklesia/ui';
import { cn } from '@/app/_ekklesia/ui/utils';
import {
  readJoinAccessToken,
  storeJoinAccessToken,
} from '../applicant-access';

type StepState = 'done' | 'current' | 'upcoming' | 'failed';

type StatusPayload = {
  id: string;
  status: string;
  stage: 'pending' | 'approved' | 'rejected';
  displayName: string;
  churchName: string;
  decisionReason: string | null;
  steps: Array<{ key: string; state: StepState }>;
};

const POLL_MS = 12_000;

function stepIcon(state: StepState): 'check' | 'alert' | 'clock' | null {
  if (state === 'done') return 'check';
  if (state === 'failed') return 'alert';
  if (state === 'current') return 'clock';
  return null;
}

function StatusInner(): React.ReactElement {
  const t = useTranslations('RegisterStatus');
  const params = useSearchParams();
  const router = useRouter();
  const requestId = params.get('requestId') ?? '';
  const queryToken = params.get('accessToken');
  const [accessToken, setAccessToken] = useState<string | null>(queryToken);
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;
    if (queryToken) {
      storeJoinAccessToken(requestId, queryToken);
      setAccessToken(queryToken);
      return;
    }
    const stored = readJoinAccessToken(requestId);
    if (stored) setAccessToken(stored);
  }, [requestId, queryToken]);

  const load = useCallback(async () => {
    if (!requestId || !accessToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/v1/public/join-requests/${requestId}?accessToken=${encodeURIComponent(accessToken)}`,
      );
      const json = (await res.json()) as StatusPayload & {
        detail?: string;
        data?: StatusPayload;
      };
      if (!res.ok) {
        setError(json.detail || t('loadFailed'));
        return;
      }
      setData(json.data ?? json);
      setError(null);
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }, [requestId, accessToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data || data.stage !== 'pending') return;
    const id = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [data, load]);

  function stageLabel(stage: StatusPayload['stage']): string {
    if (stage === 'approved') return t('stageApprovedLabel');
    if (stage === 'rejected') return t('stageRejectedLabel');
    return t('stagePendingLabel');
  }

  function stageMessage(payload: StatusPayload): string {
    if (payload.stage === 'approved') return t('stageApprovedMessage');
    if (payload.stage === 'rejected') {
      return payload.decisionReason?.trim() || t('stageRejectedMessage');
    }
    return t('stagePendingMessage', { churchName: payload.churchName });
  }

  function stepLabel(key: string): string {
    if (key === 'submitted') return t('stepSubmitted');
    if (key === 'review') return t('stepReview');
    if (key === 'ready') return t('stepReady');
    return key;
  }

  if (!requestId) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl">{t('missingIdTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('missingIdBody')}{' '}
          <Link className="underline" href="/register">
            {t('missingIdLink')}
          </Link>
          .
        </p>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl">{t('resumeTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('resumeBody')}</p>
        <Link className="text-sm underline" href="/register">
          {t('resumeLink')}
        </Link>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl">{t('loadFailedTitle')}</h1>
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
        <Button type="button" size="sm" onClick={() => void load()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (!data) return <p className="text-sm">{t('none')}</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('eyebrow')}
        </p>
        <h1 className="mt-1 font-display text-2xl text-foreground">
          {data.churchName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.displayName}</p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {stageLabel(data.stage)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {stageMessage(data)}
        </p>
      </div>

      <ol className="space-y-0">
        {data.steps.map((step, index) => (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border',
                  step.state === 'done' &&
                    'border-[color:var(--sage)] bg-[color:var(--sage-soft)]',
                  step.state === 'current' &&
                    'border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-tint)]',
                  step.state === 'failed' &&
                    'border-[color:var(--danger)] bg-[color:var(--danger-soft)]',
                  step.state === 'upcoming' &&
                    'border-border bg-surface-muted text-muted-foreground',
                )}
              >
                {stepIcon(step.state) ? (
                  <Icon name={stepIcon(step.state)!} size={14} />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                )}
              </span>
              {index < data.steps.length - 1 ? (
                <span
                  className={cn(
                    'my-1 w-px flex-1 min-h-[1.25rem]',
                    step.state === 'done' ? 'bg-[color:var(--sage)]' : 'bg-border',
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
            <div className="pb-4 pt-0.5">
              <p
                className={cn(
                  'text-sm font-medium',
                  step.state === 'upcoming'
                    ? 'text-muted-foreground'
                    : 'text-foreground',
                )}
              >
                {stepLabel(step.key)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {error ? (
        <p className="text-xs text-muted-foreground" role="status">
          {t('staleRefresh')}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {data.stage === 'approved' ? (
          <Button type="button" onClick={() => router.push('/sign-in')}>
            {t('signInCta')}
          </Button>
        ) : null}
        {data.stage === 'pending' ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            {t('refresh')}
          </Button>
        ) : null}
        <Link className="text-sm underline" href="/sign-in">
          {t('backToSignIn')}
        </Link>
      </div>
    </div>
  );
}

export function JoinRequestStatusClient(): React.ReactElement {
  const tCommon = useTranslations('Common');
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
      }
    >
      <StatusInner />
    </Suspense>
  );
}
