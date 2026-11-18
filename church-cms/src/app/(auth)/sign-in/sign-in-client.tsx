'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMemo, useState, type FormEvent } from 'react';
import {
  ApiError,
  apiFetch,
  loginRequiresMfa,
  normalizePhoneE164,
  resolvePostAuthPath,
  sanitizeAppRedirect,
} from '@/app/_ekklesia/session';
import {
  Button,
  Field,
  Input,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import { cn } from '@/app/_ekklesia/ui/utils';
import { TANZANIA_PHONE_EXAMPLE_LOCAL } from '@/platform/phone';

type IdentifierKind = 'phone' | 'email';

/**
 * Sign-in form — FundFlow panel rhythm (no nested card on the split shell).
 * Phone-first; PIN reveal on request. Auth API unchanged.
 */
export function SignInClient(): React.ReactElement {
  const t = useTranslations('SignIn');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const params = useSearchParams();
  const showHelp = params?.get('help') === '1';
  const requestedRedirect = sanitizeAppRedirect(params?.get('redirect'));

  const [identifierKind, setIdentifierKind] = useState<IdentifierKind>('phone');
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'identifier' | 'pin', string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const identifierLabel = useMemo(
    () => (identifierKind === 'phone' ? t('phoneLabel') : t('emailLabel')),
    [identifierKind, t],
  );

  function validate(): boolean {
    const nextFieldErrors: typeof fieldErrors = {};
    const trimmed =
      identifierKind === 'phone'
        ? normalizePhoneE164(identifier)
        : identifier.trim();
    if (trimmed === '') {
      nextFieldErrors.identifier =
        identifierKind === 'phone' ? t('phoneRequired') : t('emailRequired');
    } else if (
      identifierKind === 'phone' &&
      !/^\+255[67]\d{8}$/.test(trimmed)
    ) {
      nextFieldErrors.identifier = t('phoneInvalid');
    } else if (identifierKind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      nextFieldErrors.identifier = t('emailInvalid');
    }
    if (pin.trim() === '') {
      nextFieldErrors.pin = t('pinRequired');
    } else if (!/^\d{4,8}$/.test(pin.trim())) {
      nextFieldErrors.pin = t('pinInvalid');
    }
    setFieldErrors(nextFieldErrors);
    return Object.keys(nextFieldErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body =
        identifierKind === 'phone'
          ? { phoneE164: normalizePhoneE164(identifier), pin: pin.trim() }
          : { email: identifier.trim(), pin: pin.trim() };

      const result = await apiFetch<unknown>('/api/v1/auth/login', {
        method: 'POST',
        json: body,
        skipDevAuth: true,
      });

      if (loginRequiresMfa(result)) {
        const verifyQs = requestedRedirect
          ? `?redirect=${encodeURIComponent(requestedRedirect)}`
          : '';
        router.push(`/verify${verifyQs}`);
        return;
      }
      const destination = await resolvePostAuthPath(requestedRedirect);
      router.push(destination);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401 || e.status === 403) {
          setError(t('errorMismatch'));
        } else if (e.status === 429) {
          setError(t('errorRateLimit'));
        } else {
          setError(e.message || t('errorGeneric'));
        }
      } else {
        setError(t('errorNetwork'));
      }
    } finally {
      setSubmitting(false);
    }
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

      {showHelp ? (
        <div className="mb-6 rounded-xl border border-[color:var(--brand-gold-soft)] bg-[color:var(--brand-gold-tint)] px-4 py-3 text-sm text-foreground">
          <p className="font-medium">{t('helpTitle')}</p>
          <p className="mt-1 text-muted-foreground">
            {t('helpBody')}
          </p>
        </div>
      ) : null}

      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <div
          role="tablist"
          aria-label={t('methodLabel')}
          className="flex rounded-xl border border-border bg-[color:var(--peach-soft)]/50 p-1"
        >
          {(
            [
              { id: 'phone', label: t('phone') },
              { id: 'email', label: t('email') },
            ] as const
          ).map((tab) => {
            const active = identifierKind === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setIdentifierKind(tab.id);
                  setIdentifier('');
                  setFieldErrors((f) => ({ ...f, identifier: undefined }));
                }}
                className={cn(
                  'flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors focus-ring',
                  active
                    ? 'bg-surface text-foreground shadow-card ring-1 ring-[color:var(--brand-gold-soft)]'
                    : 'text-muted-foreground hover:text-[color:var(--brand-gold-ink)]',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <Field
          label={identifierLabel}
          required
          hint={
            identifierKind === 'phone' ? t('phoneHint') : t('emailHint')
          }
          error={fieldErrors.identifier}
        >
          <Input
            type={identifierKind === 'phone' ? 'tel' : 'email'}
            inputMode={identifierKind === 'phone' ? 'tel' : 'email'}
            autoComplete={identifierKind === 'phone' ? 'tel' : 'email'}
            placeholder={
              identifierKind === 'phone'
                ? TANZANIA_PHONE_EXAMPLE_LOCAL
                : tCommon('emailPlaceholder')
            }
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>

        <Field
          label={t('pinLabel')}
          required
          hint={t('pinHint')}
          error={fieldErrors.pin}
          labelAccessory={
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className="-my-3 -mr-2 inline-flex min-h-10 items-center gap-1 rounded-sm px-2 text-xs font-medium text-muted-foreground hover:text-[color:var(--brand-gold-ink)] active:text-[color:var(--brand-gold-strong)] focus-ring"
              aria-pressed={showPin}
            >
              <Icon name={showPin ? 'eye-off' : 'eye'} size={14} />
              {showPin ? tCommon('hide') : tCommon('show')}
            </button>
          }
        >
          <Input
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            autoComplete="current-password"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, ''))}
            maxLength={8}
          />
        </Field>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-3 py-2.5 text-sm text-[color:var(--danger-ink)]"
          >
            <Icon name="alert-circle" size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Button type="submit" size="lg" block loading={submitting} className="mt-1">
          {submitting ? t('submitting') : t('submit')}
        </Button>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {t('privacy')}
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t('newHere')}{' '}
        <Link
          href="/register"
          className="link-ink font-medium underline-offset-2 hover:underline focus-ring rounded-sm"
        >
          {t('requestJoin')}
        </Link>
      </p>
    </div>
  );
}
