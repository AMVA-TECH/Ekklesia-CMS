'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError, apiFetch, useSession } from '@/app/_ekklesia/session';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardSubtitle,
  CardTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  Skeleton,
  StatusPill,
  useToast,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type { MemberMembership, MemberPerson } from '../_shared/api-types';

interface FormState {
  phone: string;
  email: string;
  preferredLocale: 'en' | 'sw';
  directoryOptIn: boolean;
}

const EMPTY_FORM: FormState = {
  phone: '',
  email: '',
  preferredLocale: 'en',
  directoryOptIn: true,
};

export function ProfileClient(): React.ReactElement {
  const t = useTranslations('Profile');
  const tLocale = useTranslations('Locale');
  const tShell = useTranslations('MemberShell');
  const { user, church } = useSession();
  const { push } = useToast();
  const [person, setPerson] = useState<MemberPerson | null>(null);
  const [membership, setMembership] = useState<MemberMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [original, setOriginal] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [personResult, membershipResult] = await Promise.allSettled([
          apiFetch<MemberPerson>('/api/v1/people/me'),
          apiFetch<MemberMembership>('/api/v1/memberships/me'),
        ]);
        if (cancelled) return;

        if (personResult.status === 'fulfilled') {
          const p = personResult.value;
          setPerson(p);
          const phone = p.contacts.find(
            (c) => c.channel === 'phone' && c.isPrimary,
          )?.value ?? '';
          const email = p.contacts.find(
            (c) => c.channel === 'email' && c.isPrimary,
          )?.value ?? '';
          const next: FormState = {
            phone,
            email,
            preferredLocale: (p.preferredLocale === 'sw' ? 'sw' : 'en') as
              | 'en'
              | 'sw',
            directoryOptIn: p.directoryOptIn,
          };
          setForm(next);
          setOriginal(next);
        } else {
          const reason = personResult.reason;
          if (reason instanceof ApiError && reason.status === 404) {
            setLoadError(t('notFound'));
          } else if (reason instanceof ApiError) {
            setLoadError(reason.message);
          } else {
            setLoadError(t('connection'));
          }
        }

        if (membershipResult.status === 'fulfilled') {
          setMembership(membershipResult.value);
        } else if (
          membershipResult.reason instanceof ApiError &&
          membershipResult.reason.status === 404
        ) {
          setMembership(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const dirty = useMemo(
    () =>
      form.phone !== original.phone ||
      form.email !== original.email ||
      form.preferredLocale !== original.preferredLocale ||
      form.directoryOptIn !== original.directoryOptIn,
    [form, original],
  );

  function validate(): boolean {
    const next: typeof fieldErrors = {};
    const phone = form.phone.trim();
    if (phone && !/^\+[1-9]\d{6,14}$/.test(phone)) {
      next.phone = t('phoneInvalid');
    }
    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = t('emailInvalid');
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const patch: Record<string, string | boolean | null | undefined> = {};
      if (form.phone.trim() !== original.phone)
        patch.phoneE164 = form.phone.trim() || null;
      if (form.email.trim() !== original.email)
        patch.email = form.email.trim() || null;
      if (form.preferredLocale !== original.preferredLocale)
        patch.preferredLocale = form.preferredLocale;
      if (form.directoryOptIn !== original.directoryOptIn)
        patch.directoryOptIn = form.directoryOptIn;

      const updated = await apiFetch<MemberPerson>('/api/v1/people/me', {
        method: 'PATCH',
        json: patch,
      });
      setPerson(updated);
      setOriginal(form);
      push({
        tone: 'success',
        title: t('savedTitle'),
        message: t('savedBody'),
      });
    } catch (e) {
      if (e instanceof ApiError) {
        push({
          tone: 'danger',
          title: t('saveFailTitle'),
          message: e.message || t('saveFailBody'),
        });
      } else {
        push({ tone: 'danger', message: t('connection') });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !person) {
    return <ProfileSkeleton />;
  }

  if (loadError && !person) {
    return (
      <EmptyState
        icon="user"
        tone="peach"
        title={t('unavailable')}
        description={loadError}
      />
    );
  }

  if (!person) {
    return (
      <EmptyState
        icon="user"
        tone="peach"
        title={t('notSetup')}
        description={t('notSetupBody')}
      />
    );
  }

  const displayName =
    person.fullName && person.fullName.trim().length > 0
      ? person.fullName
      : person.displayName || user?.displayName || tShell('you');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('title')} lede={t('lede')} />

      <Card padding="lg" className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={displayName} size="xl" tone="brand" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground truncate">
            {displayName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground truncate">
            {church?.name ?? t('yourChurch')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {membership ? (
              <StatusPill
                tone={membership.status === 'active' ? 'success' : 'neutral'}
              >
                {titleize(membership.status)} ·{' '}
                {titleize(membership.membershipType)}
              </StatusPill>
            ) : (
              <Badge tone="neutral">{t('memberInProgress')}</Badge>
            )}
            {user?.locale ? (
              <Badge tone="neutral">
                <Icon name="globe" size={12} className="mr-1" />
                {user.locale.toUpperCase()}
              </Badge>
            ) : null}
          </div>
        </div>
      </Card>

      <Panel title={t('contactTitle')} subtitle={t('contactSubtitle')}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label={t('phone')} hint={t('phoneHint')} error={fieldErrors.phone}>
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+255 7XX XXX XXX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>

          <Field label={t('email')} hint={t('emailHint')} error={fieldErrors.email}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </Field>

          <Field label={t('language')} hint={t('languageHint')}>
            <Select
              value={form.preferredLocale}
              onChange={(e) =>
                setForm({
                  ...form,
                  preferredLocale: e.target.value as 'en' | 'sw',
                })
              }
            >
              <option value="en">{tLocale('en')}</option>
              <option value="sw">{tLocale('sw')}</option>
            </Select>
          </Field>

          <Field label={t('directory')} hint={t('directoryHint')}>
            <label className="flex items-start gap-3 rounded-md border border-border bg-surface px-3 py-3 text-sm">
              <input
                type="checkbox"
                checked={form.directoryOptIn}
                onChange={(e) =>
                  setForm({ ...form, directoryOptIn: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded-sm border-border accent-[color:var(--brand-gold-ink)] focus-ring"
              />
              <span>
                <span className="font-medium text-foreground">
                  {t('directoryOptIn')}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t('directoryPrivacy')}
                </span>
              </span>
            </label>
          </Field>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button type="submit" loading={submitting} disabled={!dirty || submitting}>
              {dirty ? t('saveChanges') : t('allSaved')}
            </Button>
            {dirty ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setForm(original);
                  setFieldErrors({});
                }}
              >
                {t('discard')}
              </Button>
            ) : null}
          </div>
        </form>
      </Panel>

      <Panel title={t('accountTitle')} subtitle={t('accountSubtitle')}>
        <div className="flex flex-col gap-3">
          <AccountFact
            icon="phone"
            label={t('primaryPhone')}
            value={
              person.contacts.find((c) => c.channel === 'phone' && c.isPrimary)
                ?.value ?? user?.phoneE164 ?? t('notOnFile')
            }
          />
          <AccountFact
            icon="mail"
            label={t('primaryEmail')}
            value={
              person.contacts.find((c) => c.channel === 'email' && c.isPrimary)
                ?.value ?? user?.email ?? t('notOnFile')
            }
          />
          <AccountFact icon="key" label={t('pin')} value={t('pinHidden')} />
        </div>
      </Panel>

      <Card padding="md">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md tone-sage"
          >
            <Icon name="shield" size={18} />
          </span>
          <div>
            <CardTitle>{t('privacyTitle')}</CardTitle>
            <CardSubtitle>{t('privacyBody')}</CardSubtitle>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AccountFact({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-surface px-3 py-3">
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground"
      >
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function titleize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, ' ');
}

function ProfileSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton size="heading" className="w-1/2" />
      <Skeleton size="block" className="h-28 w-full" radius="md" />
      <Skeleton size="block" className="h-64 w-full" radius="md" />
      <Skeleton size="block" className="h-40 w-full" radius="md" />
    </div>
  );
}
