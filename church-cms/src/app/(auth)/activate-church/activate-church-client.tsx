'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useId, useState, type FormEvent } from 'react';
import { Button, Field, Input } from '@/app/_ekklesia/ui';

function ActivateInner(): React.ReactElement {
  const t = useTranslations('ActivateChurch');
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const formId = useId();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    name: string;
    slug: string;
  } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4,8}$/.test(pin)) {
      setError(t('pinInvalid'));
      return;
    }
    if (pin !== confirm) {
      setError(t('pinMismatch'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/public/admin-invites/accept', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, pin }),
      });
      const json = (await res.json()) as {
        detail?: string;
        church?: { name: string; slug: string };
        data?: { church?: { name: string; slug: string } };
      };
      if (!res.ok) {
        setError(json.detail || t('failed'));
        return;
      }
      const church = json.church ?? json.data?.church;
      if (church) {
        setDone({ name: church.name, slug: church.slug });
      } else {
        setDone({ name: t('fallbackChurch'), slug: '' });
      }
    } catch {
      setError(t('networkError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl">{t('invalidTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('invalidBody')}</p>
        <Link className="text-sm underline" href="/register-church">
          {t('registerLink')}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl">{t('doneTitle')}</h1>
        <p className="text-muted-foreground">
          {done.slug
            ? t('doneBodySlug', { name: done.name, slug: done.slug })
            : t('doneBody', { name: done.name })}
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>{t('step1')}</li>
          <li>{t('step2')}</li>
          <li>{t('step3')}</li>
        </ol>
        <Link
          className="inline-flex text-sm font-medium underline"
          href="/sign-in"
        >
          {t('signInLink')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label={t('pinLabel')} htmlFor={`${formId}-pin`}>
          <Input
            id={`${formId}-pin`}
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <Field label={t('confirmLabel')} htmlFor={`${formId}-confirm`}>
          <Input
            id={`${formId}-confirm`}
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </Field>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? t('submitting') : t('submit')}
        </Button>
      </form>
    </div>
  );
}

export function ActivateChurchClient(): React.ReactElement {
  const tCommon = useTranslations('Common');
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">{tCommon('loading')}</p>}>
      <ActivateInner />
    </Suspense>
  );
}
