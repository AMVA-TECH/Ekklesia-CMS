'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';
import { Button, Field, Input, Select } from '@/app/_ekklesia/ui';
import {
  TANZANIA_PHONE_EXAMPLE_LOCAL,
  normalizeTanzaniaPhoneE164,
} from '@/platform/phone';
import {
  statusPath,
  storeApplicantAccessToken,
} from './applicant-access';

type SubmitResult = {
  id: string;
  status: string;
  accessToken: string | null;
  verifyTokenDev?: string | null;
};

/**
 * Public church-tenant registration (not member join).
 * Multi-step onboarding → status tracker. No session is created.
 */
export function RegisterChurchClient(): React.ReactElement {
  const t = useTranslations('RegisterChurch');
  const formId = useId();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [officialName, setOfficialName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('');
  const [denomination, setDenomination] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [representativeRole, setRepresentativeRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredContact, setPreferredContact] = useState<'email' | 'phone'>(
    'email',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { id: 1, label: t('stepChurch') },
    { id: 2, label: t('stepYou') },
    { id: 3, label: t('stepReview') },
  ] as const;

  function validateStep(current: number): boolean {
    setError(null);
    if (current === 1) {
      if (officialName.trim().length < 2) {
        setError(t('nameRequired'));
        return false;
      }
      return true;
    }
    if (current === 2) {
      if (representativeName.trim().length < 2) {
        setError(t('repRequired'));
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError(t('emailInvalid'));
        return false;
      }
      if (phone.trim()) {
        const e164 = normalizeTanzaniaPhoneE164(phone.trim());
        if (!e164) {
          setError(t('phoneInvalid'));
          return false;
        }
      }
      return true;
    }
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateStep(3)) return;
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        officialName: officialName.trim(),
        representativeName: representativeName.trim(),
        email: email.trim(),
        preferredContact,
        country: 'TZ',
      };
      if (displayName.trim()) body.displayName = displayName.trim();
      if (location.trim()) body.location = location.trim();
      if (denomination.trim()) body.denomination = denomination.trim();
      if (description.trim()) body.description = description.trim();
      if (website.trim()) body.website = website.trim();
      if (representativeRole.trim()) {
        body.representativeRole = representativeRole.trim();
      }
      if (phone.trim()) {
        const e164 = normalizeTanzaniaPhoneE164(phone.trim());
        if (!e164) {
          setError(t('phoneInvalid'));
          setSubmitting(false);
          return;
        }
        body.phoneE164 = e164;
      }

      const res = await fetch('/api/v1/public/church-registrations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        data?: SubmitResult;
        detail?: string;
        title?: string;
      } & SubmitResult;
      if (!res.ok) {
        setError(json.detail || json.title || t('submitFailed'));
        return;
      }
      const data = json.data ?? json;
      if (data.accessToken) {
        storeApplicantAccessToken(data.id, data.accessToken);
      }
      if (data.verifyTokenDev) {
        sessionStorage.setItem(
          `church-reg-verify-dev:${data.id}`,
          data.verifyTokenDev,
        );
      }
      router.push(statusPath(data.id, data.accessToken));
    } catch {
      setError(t('networkError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('subtitle')}{' '}
          <Link className="underline" href="/register">
            {t('memberLink')}
          </Link>
        </p>
      </div>

      <ol className="flex gap-2" aria-label={t('title')}>
        {steps.map((item) => (
          <li
            key={item.id}
            className={
              item.id === step
                ? 'flex-1 rounded-md border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-tint)] px-2 py-1.5 text-center text-xs font-semibold text-foreground'
                : item.id < step
                  ? 'flex-1 rounded-md border border-border bg-surface-muted px-2 py-1.5 text-center text-xs font-medium text-foreground'
                  : 'flex-1 rounded-md border border-border px-2 py-1.5 text-center text-xs text-muted-foreground'
            }
          >
            {item.label}
          </li>
        ))}
      </ol>

      <form id={formId} className="space-y-4" onSubmit={onSubmit}>
        {step === 1 ? (
          <>
            <Field label={t('officialName')} htmlFor={`${formId}-name`}>
              <Input
                id={`${formId}-name`}
                value={officialName}
                onChange={(e) => setOfficialName(e.target.value)}
                required
                minLength={2}
                autoFocus
              />
            </Field>
            <Field label={t('displayName')} htmlFor={`${formId}-display`}>
              <Input
                id={`${formId}-display`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Field>
            <Field label={t('location')} htmlFor={`${formId}-loc`}>
              <Input
                id={`${formId}-loc`}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Field>
            <Field label={t('denomination')} htmlFor={`${formId}-denom`}>
              <Input
                id={`${formId}-denom`}
                value={denomination}
                onChange={(e) => setDenomination(e.target.value)}
              />
            </Field>
            <Field label={t('website')} htmlFor={`${formId}-web`}>
              <Input
                id={`${formId}-web`}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder={t('websitePlaceholder')}
              />
            </Field>
            <Field label={t('description')} htmlFor={`${formId}-desc`}>
              <textarea
                id={`${formId}-desc`}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
              />
            </Field>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field label={t('yourName')} htmlFor={`${formId}-rep`}>
              <Input
                id={`${formId}-rep`}
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                required
                minLength={2}
                autoFocus
              />
            </Field>
            <Field label={t('yourRole')} htmlFor={`${formId}-role`}>
              <Input
                id={`${formId}-role`}
                value={representativeRole}
                onChange={(e) => setRepresentativeRole(e.target.value)}
                placeholder={t('rolePlaceholder')}
              />
            </Field>
            <Field label={t('email')} htmlFor={`${formId}-email`}>
              <Input
                id={`${formId}-email`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field
              label={t('phoneOptional', { example: TANZANIA_PHONE_EXAMPLE_LOCAL })}
              htmlFor={`${formId}-phone`}
            >
              <Input
                id={`${formId}-phone`}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label={t('preferredContact')} htmlFor={`${formId}-pref`}>
              <Select
                id={`${formId}-pref`}
                value={preferredContact}
                onChange={(e) =>
                  setPreferredContact(e.target.value as 'email' | 'phone')
                }
              >
                <option value="email">{t('contactEmail')}</option>
                <option value="phone">{t('contactPhone')}</option>
              </Select>
            </Field>
          </>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3 rounded-md border border-border bg-surface-muted px-3 py-3 text-sm">
            <p>
              <span className="text-muted-foreground">{t('reviewChurch')}</span>
              <br />
              <span className="font-medium text-foreground">{officialName}</span>
              {displayName ? (
                <span className="text-muted-foreground"> ({displayName})</span>
              ) : null}
            </p>
            {location ? (
              <p className="text-muted-foreground">{location}</p>
            ) : null}
            <p>
              <span className="text-muted-foreground">{t('reviewApplicant')}</span>
              <br />
              <span className="font-medium text-foreground">
                {representativeName}
              </span>
              {representativeRole ? (
                <span className="text-muted-foreground">
                  {' '}
                  · {representativeRole}
                </span>
              ) : null}
            </p>
            <p className="text-muted-foreground">{email}</p>
            <p className="text-xs text-muted-foreground">{t('reviewNext')}</p>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {step > 1 ? (
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setStep((s) => s - 1)}
            >
              {t('back')}
            </Button>
          ) : null}
          {step < 3 ? (
            <Button
              type="button"
              onClick={() => {
                if (validateStep(step)) setStep((s) => s + 1);
              }}
            >
              {t('continue')}
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting ? t('submitting') : t('submit')}
            </Button>
          )}
        </div>
      </form>

      <p className="text-xs text-muted-foreground">{t('alreadyApplied')}</p>
    </div>
  );
}
