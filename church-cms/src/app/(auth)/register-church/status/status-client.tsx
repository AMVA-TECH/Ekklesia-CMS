'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Icon } from '@/app/_ekklesia/icons';
import { Button, Skeleton } from '@/app/_ekklesia/ui';
import { cn } from '@/app/_ekklesia/ui/utils';
import {
  readApplicantAccessToken,
  storeApplicantAccessToken,
} from '../applicant-access';

type StepState = 'done' | 'current' | 'upcoming' | 'failed';

type StatusPayload = {
  id: string;
  status: string;
  officialName: string;
  emailVerified: boolean;
  stage: string;
  stageLabel: string;
  message: string;
  provisioningStatus: string | null;
  church: {
    name: string;
    slug: string;
    lifecycleStatus: string | null;
  } | null;
  steps: Array<{ key: string; label: string; state: StepState }>;
};

const POLL_MS = 12_000;

const STEP_LABEL_KEYS: Record<string, string> = {
  verify_email: 'stepVerifyEmail',
  in_review: 'stepInReview',
  provisioning: 'stepProvisioning',
  activate: 'stepActivate',
  active: 'stepActive',
};

function stepIcon(state: StepState): 'check' | 'alert' | 'clock' | null {
  if (state === 'done') return 'check';
  if (state === 'failed') return 'alert';
  if (state === 'current') return 'clock';
  return null;
}

function StatusInner(): React.ReactElement {
  const t = useTranslations('RegisterChurchStatus');
  const params = useSearchParams();
  const router = useRouter();
  const applicationId = params.get('applicationId') ?? '';
  const queryToken = params.get('accessToken');
  const [accessToken, setAccessToken] = useState<string | null>(queryToken);
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!applicationId) return;
    if (queryToken) {
      storeApplicantAccessToken(applicationId, queryToken);
      setAccessToken(queryToken);
      return;
    }
    const stored = readApplicantAccessToken(applicationId);
    if (stored) setAccessToken(stored);
  }, [applicationId, queryToken]);

  const load = useCallback(async () => {
    if (!applicationId || !accessToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/v1/public/church-registrations/${applicationId}?accessToken=${encodeURIComponent(accessToken)}`,
      );
      const json = (await res.json()) as StatusPayload & {
        detail?: string;
        data?: StatusPayload;
      };
      if (!res.ok) {
        setError(json.detail || t('loadFailed'));
        return;
      }
      const payload = json.data ?? json;
      setData(payload);
      setError(null);
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }, [applicationId, accessToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data) return;
    if (data.stage === 'active' || data.stage === 'rejected') return;
    const id = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [data, load]);

  function stageLabel(stage: string): string {
    switch (stage) {
      case 'verify_email':
        return t('stageVerifyEmailLabel');
      case 'in_review':
        return t('stageInReviewLabel');
      case 'rejected':
        return t('stageRejectedLabel');
      case 'provisioning':
        return t('stageProvisioningLabel');
      case 'activate':
        return t('stageActivateLabel');
      case 'active':
        return t('stageActiveLabel');
      default:
        return stage;
    }
  }

  function stageMessage(payload: StatusPayload): string {
    if (payload.stage === 'rejected') {
      const englishDefault =
        'Your application was not approved. Contact support if you have questions.';
      if (payload.message?.trim() && payload.message.trim() !== englishDefault) {
        return payload.message.trim();
      }
      return t('stageRejectedMessage');
    }
    if (
      payload.stage === 'provisioning' &&
      payload.provisioningStatus === 'failed'
    ) {
      return t('stageProvisioningFailedMessage');
    }
    switch (payload.stage) {
      case 'verify_email':
        return t('stageVerifyEmailMessage');
      case 'in_review':
        return t('stageInReviewMessage');
      case 'provisioning':
        return t('stageProvisioningMessage');
      case 'activate':
        return t('stageActivateMessage');
      case 'active':
        return t('stageActiveMessage');
      default:
        return payload.message;
    }
  }

  if (!applicationId) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl">{t('missingIdTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('missingIdBody')}{' '}
          <Link className="underline" href="/register-church">
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
        <Link className="text-sm underline" href="/register-church">
          {t('resumeLink')}
        </Link>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
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
          {data.officialName}
        </h1>
        <p className="mt-2 text-sm font-medium text-foreground">
          {stageLabel(data.stage)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {stageMessage(data)}
        </p>
      </div>

      <ol className="space-y-0">
        {data.steps.map((step, index) => {
          const labelKey = STEP_LABEL_KEYS[step.key];
          const label = labelKey ? t(labelKey as 'stepVerifyEmail') : step.label;
          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border text-[color:var(--foreground)]',
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
                      step.state === 'done'
                        ? 'bg-[color:var(--sage)]'
                        : 'bg-border',
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
                  {label}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {error ? (
        <p className="text-xs text-muted-foreground" role="status">
          {t('staleRefresh')}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {data.stage === 'verify_email' ? (
          <div className="space-y-2">
            <p className="rounded-md border border-border bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
              {t('verifyHint')}
            </p>
            {(() => {
              try {
                const devToken = sessionStorage.getItem(
                  `church-reg-verify-dev:${applicationId}`,
                );
                if (!devToken) return null;
                return (
                  <p className="rounded-md border border-border bg-surface-muted px-3 py-2 text-xs">
                    {t('devVerify')}{' '}
                    <Link
                      className="underline"
                      href={`/register-church/verify?applicationId=${applicationId}&token=${encodeURIComponent(devToken)}`}
                    >
                      {t('devVerifyLink')}
                    </Link>
                  </p>
                );
              } catch {
                return null;
              }
            })()}
          </div>
        ) : null}

        {data.stage === 'activate' ? (
          <p className="rounded-md border border-[color:var(--brand-gold-soft)] bg-[color:var(--brand-gold-tint)] px-3 py-2 text-xs text-[color:var(--brand-gold-ink)]">
            {t('activateHint')}
          </p>
        ) : null}

        {data.stage === 'active' && data.church ? (
          <Button type="button" onClick={() => router.push('/sign-in')}>
            {t('signInTo', { name: data.church.name })}
          </Button>
        ) : null}

        {data.stage !== 'active' && data.stage !== 'rejected' ? (
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

export function RegistrationStatusClient(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <StatusInner />
    </Suspense>
  );
}
