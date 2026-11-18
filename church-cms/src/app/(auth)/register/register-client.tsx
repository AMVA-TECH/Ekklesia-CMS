'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState, type FormEvent } from 'react';
import {
  Button,
  Dialog,
  DialogFooter,
  Field,
  Input,
  Select,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import {
  TANZANIA_PHONE_EXAMPLE_LOCAL,
  normalizeTanzaniaPhoneE164,
} from '@/platform/phone';

type ChurchHit = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  defaultLocale: string;
};

type SuccessState = {
  churchName: string;
  message: string;
};

/**
 * Single registration form: full name, contact, and church to join.
 * Join request only — success dialog explains waiting for attachment.
 */
export function RegisterClient(): React.ReactElement {
  const t = useTranslations('Register');
  const tCommon = useTranslations('Common');
  const tLocale = useTranslations('Locale');
  const router = useRouter();
  const formId = useId();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [locale, setLocale] = useState<'en' | 'sw'>('sw');
  const [churchQuery, setChurchQuery] = useState('');
  const [hits, setHits] = useState<ChurchHit[]>([]);
  const [church, setChurch] = useState<ChurchHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<
      Record<'firstName' | 'lastName' | 'email' | 'phone' | 'church', string>
    >
  >({});
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [failureOpen, setFailureOpen] = useState(false);

  useEffect(() => {
    if (church) return;
    const q = churchQuery.trim();
    if (q.length < 2) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const res = await fetch(
            `/api/v1/public/churches?q=${encodeURIComponent(q)}`,
          );
          const body = await res.json();
          if (!res.ok) {
            setHits([]);
            return;
          }
          setHits(body.data?.items ?? body.items ?? []);
        } catch {
          setHits([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 280);
    return () => window.clearTimeout(handle);
  }, [churchQuery, church]);

  function validate(): boolean {
    const next: typeof fieldErrors = {};
    if (firstName.trim().length < 1) {
      next.firstName = t('firstNameRequired');
    }
    if (lastName.trim().length < 1) {
      next.lastName = t('lastNameRequired');
    }
    const emailTrim = email.trim();
    const phoneTrim = phone.trim();
    if (!phoneTrim) {
      next.phone = t('phoneRequired');
    } else if (!normalizeTanzaniaPhoneE164(phoneTrim)) {
      next.phone = t('phoneInvalid');
    }
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      next.email = t('emailInvalid');
    }
    if (!church) {
      next.church = t('churchRequired');
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setFailureOpen(false);
    if (!validate() || !church) return;

    setSubmitting(true);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const res = await fetch('/api/v1/public/join-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          churchId: church.id,
          displayName,
          preferredLocale: locale,
          phoneE164: normalizeTanzaniaPhoneE164(phone.trim())!,
          ...(email.trim() ? { email: email.trim() } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.detail || body?.title || t('requestFailed'));
      }
      const payload = body.data ?? body;
      setSuccess({
        churchName: church.name,
        message: payload.message || t('successDefaultMessage'),
      });
      setSuccessOpen(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('requestFailed'));
      setFailureOpen(true);
    } finally {
      setSubmitting(false);
    }
  }

  function closeSuccessDialog(): void {
    setSuccessOpen(false);
  }

  function closeFailureDialog(): void {
    setFailureOpen(false);
  }

  return (
    <div className="flex flex-col">
      <div className="mb-8 text-center lg:text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
          {t('title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {success && !successOpen ? (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-xl border-2 border-[color:var(--success)] bg-[color:var(--success-soft)] px-4 py-3 text-sm text-[color:var(--success-ink)]"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--success)] text-white">
            <Icon name="check-circle" size={20} />
          </span>
          <div>
            <p className="font-semibold">{t('receivedTitle')}</p>
            <p className="mt-1 opacity-90">
              {t('receivedBody', { churchName: success.churchName })}
            </p>
          </div>
        </div>
      ) : null}

      <form
        id={formId}
        className="flex flex-col gap-5"
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('firstName')} required error={fieldErrors.firstName}>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              maxLength={60}
              disabled={Boolean(success)}
            />
          </Field>
          <Field label={t('lastName')} required error={fieldErrors.lastName}>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              maxLength={60}
              disabled={Boolean(success)}
            />
          </Field>
        </div>

        <Field
          label={t('phone')}
          required
          hint={t('phoneHint')}
          error={fieldErrors.phone}
        >
          <Input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder={TANZANIA_PHONE_EXAMPLE_LOCAL}
            disabled={Boolean(success)}
          />
        </Field>

        <Field label={t('email')} hint={tCommon('optional')} error={fieldErrors.email}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder={tCommon('emailPlaceholder')}
            disabled={Boolean(success)}
          />
        </Field>

        <Field
          label={t('churchLabel')}
          required
          hint={
            church ? t('churchHintSelected') : t('churchHintSearch')
          }
          error={fieldErrors.church}
        >
          {church ? (
            <div className="flex items-center gap-2">
              <Input
                value={church.name}
                readOnly
                aria-label={t('selectedChurch')}
                disabled={Boolean(success)}
              />
              {!success ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setChurch(null);
                    setChurchQuery('');
                    setHits([]);
                  }}
                >
                  {tCommon('change')}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="relative">
              <Input
                value={churchQuery}
                onChange={(e) => {
                  setChurchQuery(e.target.value);
                  if (e.target.value.trim().length < 2) setHits([]);
                  setFieldErrors((f) => ({ ...f, church: undefined }));
                }}
                placeholder={t('searchPlaceholder')}
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={hits.length > 0}
              />
              {searching ? (
                <p className="mt-1 text-xs text-muted-foreground">{tCommon('searching')}</p>
              ) : null}
              {hits.length > 0 ? (
                <ul
                  role="listbox"
                  className="mt-2 max-h-48 overflow-auto rounded-xl border border-border bg-surface shadow-card"
                >
                  {hits.map((h) => (
                    <li key={h.id} role="option" aria-selected={false}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start px-3 py-2.5 text-left text-sm hover:bg-[color:var(--peach-soft)]/60 focus-ring"
                        onClick={() => {
                          setChurch(h);
                          setChurchQuery(h.name);
                          setHits([]);
                          setFieldErrors((f) => ({ ...f, church: undefined }));
                        }}
                      >
                        <span className="font-medium text-foreground">
                          {h.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {h.slug}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </Field>

        <Field label={t('language')}>
          <Select
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'sw')}
            disabled={Boolean(success)}
          >
            <option value="sw">{tLocale('sw')}</option>
            <option value="en">{tLocale('en')}</option>
          </Select>
        </Field>

        <Button
          type="submit"
          size="lg"
          block
          loading={submitting}
          disabled={Boolean(success)}
          className="mt-1"
        >
          {submitting
            ? t('submitting')
            : success
              ? t('submitted')
              : t('submit')}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t('alreadyApproved')}{' '}
        <Link
          href="/sign-in"
          className="link-ink font-medium underline-offset-2 hover:underline focus-ring rounded-sm"
        >
          {t('signIn')}
        </Link>
      </p>

      <Dialog
        open={successOpen && Boolean(success)}
        onClose={closeSuccessDialog}
        title={t('successTitle')}
        description={t('successDescription')}
        size="sm"
        hideCloseButton
        footer={
          <DialogFooter>
            <Button variant="secondary" onClick={closeSuccessDialog}>
              {t('stayHere')}
            </Button>
            <Button
              data-autofocus
              onClick={() => {
                setSuccessOpen(false);
                router.push('/sign-in');
              }}
            >
              {t('goToSignIn')}
            </Button>
          </DialogFooter>
        }
      >
        {success ? (
          <div className="space-y-4 text-sm text-foreground">
            <div className="flex flex-col items-center rounded-2xl border-2 border-[color:var(--success)] bg-[color:var(--success-soft)] px-4 py-5 text-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--success)] text-white shadow-sm">
                <Icon name="check-circle" size={36} />
              </span>
              <p className="mt-3 text-base font-semibold text-[color:var(--success-ink)]">
                {tCommon('success')}
              </p>
              <p className="mt-1 text-[color:var(--success-ink)] opacity-90">
                {success.message}
              </p>
            </div>
            <div className="rounded-xl border-2 border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-tint)] px-3 py-3">
              <p className="font-semibold text-[color:var(--brand-gold-ink)]">
                {t('waitingTitle')}
              </p>
              <p className="mt-1 text-sm text-[color:var(--brand-gold-ink)] opacity-90">
                {t('waitingBody', { churchName: success.churchName })}
              </p>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={failureOpen && Boolean(error)}
        onClose={closeFailureDialog}
        title={t('failureTitle')}
        description={t('failureDescription')}
        size="sm"
        hideCloseButton
        footer={
          <DialogFooter>
            <Button data-autofocus onClick={closeFailureDialog}>
              {tCommon('retry')}
            </Button>
          </DialogFooter>
        }
      >
        <div className="flex flex-col items-center rounded-2xl border-2 border-[color:var(--danger)] bg-[color:var(--danger-soft)] px-4 py-5 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--danger)] text-white shadow-sm">
            <Icon name="alert-circle" size={36} />
          </span>
          <p className="mt-3 text-base font-semibold text-[color:var(--danger-ink)]">
            {tCommon('failed')}
          </p>
          <p className="mt-1 text-[color:var(--danger-ink)] opacity-90">
            {error}
          </p>
        </div>
      </Dialog>
    </div>
  );
}
