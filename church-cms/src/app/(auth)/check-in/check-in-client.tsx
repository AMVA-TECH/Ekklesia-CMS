'use client';

import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import { Button, Field, Input } from '@/app/_ekklesia/ui';

interface CheckInResult {
  sessionId: string;
  personId: string;
  recordId: string;
  presence: string;
  source: string;
}

/**
 * Guest / member self check-in after scanning a session QR.
 * Posts to the public `POST /api/v1/attendance/check-ins` endpoint.
 */
export function CheckInClient(): React.ReactElement {
  const t = useTranslations('CheckIn');
  const formId = useId();
  const searchParams = useSearchParams();
  const token = useMemo(
    () => (searchParams.get('token') ?? '').trim(),
    [searchParams],
  );

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  /** Sync lock — blocks double-taps before React re-renders `submitting`. */
  const inFlight = useRef(false);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (inFlight.current || submitting || done) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!token) {
      setFormError(t('errorMissingToken'));
      return;
    }
    if (!trimmedName && !trimmedPhone) {
      setFormError(t('errorIdentity'));
      return;
    }

    inFlight.current = true;
    setFormError(null);
    setSubmitting(true);
    try {
      await apiFetch<CheckInResult>('/api/v1/attendance/check-ins', {
        method: 'POST',
        skipDevAuth: true,
        json: {
          token,
          ...(trimmedName ? { name: trimmedName } : {}),
          ...(trimmedPhone ? { phone: trimmedPhone } : {}),
        },
      });
      setDone(true);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('errorGeneric'),
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="font-[family-name:var(--font-scripture)] text-2xl font-semibold tracking-tight">
          {t('missingTokenTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('missingTokenBody')}
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3" role="status">
        <h1 className="font-[family-name:var(--font-scripture)] text-2xl font-semibold tracking-tight">
          {t('doneTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('doneBody')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-[family-name:var(--font-scripture)] text-2xl font-semibold tracking-tight">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <form
        id={formId}
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="flex flex-col gap-4"
      >
        {formError ? (
          <div
            role="alert"
            className="rounded-md border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--danger-ink)]"
          >
            {formError}
          </div>
        ) : null}

        <Field label={t('nameLabel')} hint={t('nameHint')}>
          <Input
            data-autofocus
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            disabled={submitting}
          />
        </Field>

        <Field label={t('phoneLabel')} hint={t('phoneHint')}>
          <Input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('phonePlaceholder')}
            disabled={submitting}
          />
        </Field>

        <Button
          type="submit"
          loading={submitting}
          disabled={submitting || done}
          className="w-full"
        >
          {submitting ? t('submitting') : t('submit')}
        </Button>
      </form>
    </div>
  );
}
