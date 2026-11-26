'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/app/_ekklesia/ui';
import {
  readApplicantAccessToken,
  statusPath,
} from '../applicant-access';

function VerifyInner(): React.ReactElement {
  const t = useTranslations('RegisterChurchVerify');
  const params = useSearchParams();
  const router = useRouter();
  const applicationId = params.get('applicationId') ?? '';
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState<string | null>(null);

  async function verify() {
    setStatus('loading');
    setMessage(null);
    try {
      const res = await fetch(
        '/api/v1/public/church-registrations/verify-email',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ applicationId, token }),
        },
      );
      const json = (await res.json()) as {
        detail?: string;
        status?: string;
        data?: { status?: string };
      };
      if (!res.ok) {
        setStatus('error');
        setMessage(json.detail || t('failed'));
        return;
      }
      setStatus('ok');
      setMessage(t('okRedirect'));
      const accessToken = readApplicantAccessToken(applicationId);
      window.setTimeout(() => {
        router.replace(statusPath(applicationId, accessToken));
      }, 900);
    } catch {
      setStatus('error');
      setMessage(t('networkError'));
    }
  }

  useEffect(() => {
    if (applicationId && token) {
      void verify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount with URL params
  }, []);

  if (!applicationId || !token) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl">{t('missingTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('missingBody')}{' '}
          <Link className="underline" href="/register-church">
            {t('missingLink')}
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">{t('title')}</h1>
      {status === 'loading' ? (
        <p className="text-sm text-muted-foreground">{t('confirming')}</p>
      ) : null}
      {message ? (
        <p
          className={
            status === 'error' ? 'text-sm text-danger' : 'text-sm text-foreground'
          }
        >
          {message}
        </p>
      ) : null}
      {status === 'error' ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void verify()}>
            {t('retry')}
          </Button>
          <Link className="text-sm underline self-center" href="/register-church">
            {t('newApplication')}
          </Link>
        </div>
      ) : null}
      {status === 'ok' ? (
        <p className="text-sm text-muted-foreground">{t('okBody')}</p>
      ) : null}
    </div>
  );
}

export function VerifyRegistrationClient(): React.ReactElement {
  const tCommon = useTranslations('Common');
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">{tCommon('loading')}</p>}>
      <VerifyInner />
    </Suspense>
  );
}
