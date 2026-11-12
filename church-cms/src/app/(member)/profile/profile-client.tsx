'use client';

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
    setLoading(true);
    setLoadError(null);
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
            setLoadError(
              'We could not find your profile. Please talk to your church office.',
            );
          } else if (reason instanceof ApiError) {
            setLoadError(reason.message);
          } else {
            setLoadError('Check your connection and try again.');
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
  }, []);

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
      next.phone = 'Use the international format, e.g. +255 7XX XXX XXX.';
    }
    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = 'That email does not look right.';
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
        title: 'Saved',
        message: 'Your profile has been updated.',
      });
    } catch (e) {
      if (e instanceof ApiError) {
        push({
          tone: 'danger',
          title: 'We couldn’t save your changes',
          message: e.message || 'Try again in a moment.',
        });
      } else {
        push({ tone: 'danger', message: 'Check your connection and try again.' });
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
        title="Profile unavailable"
        description={loadError}
      />
    );
  }

  if (!person) {
    return (
      <EmptyState
        icon="user"
        tone="peach"
        title="Profile not set up yet"
        description="Your church office will finish setting up your profile soon."
      />
    );
  }

  const displayName =
    person.fullName && person.fullName.trim().length > 0
      ? person.fullName
      : person.displayName || user?.displayName || 'You';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My profile" lede="How your church reaches you and what we share." />

      {/* Hero summary */}
      <Card padding="lg" className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={displayName} size="xl" tone="brand" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-foreground truncate">
            {displayName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground truncate">
            {church?.name ?? 'Your church'}
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
              <Badge tone="neutral">Member in progress</Badge>
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

      {/* Edit form */}
      <Panel
        title="Contact details"
        subtitle="We’ll use these to send reminders and important notices."
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field
            label="Phone"
            hint="We send reminders by text."
            error={fieldErrors.phone}
          >
            <Input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+255 7XX XXX XXX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>

          <Field label="Email" hint="Used for occasional updates." error={fieldErrors.email}>
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

          <Field
            label="Preferred language"
            hint="Which language should we use when we message you?"
          >
            <Select
              value={form.preferredLocale}
              onChange={(e) =>
                setForm({
                  ...form,
                  preferredLocale: e.target.value as 'en' | 'sw',
                })
              }
            >
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </Select>
          </Field>

          <Field
            label="Church directory"
            hint="When on, other members can see your name in the church directory."
          >
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
                  Let other members see me in the directory
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Giving records, attendance, and notes are never shared.
                </span>
              </span>
            </label>
          </Field>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button type="submit" loading={submitting} disabled={!dirty || submitting}>
              {dirty ? 'Save changes' : 'All saved'}
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
                Discard
              </Button>
            ) : null}
          </div>
        </form>
      </Panel>

      <Panel
        title="Account & safety"
        subtitle="How you sign in and protect your account."
      >
        <div className="flex flex-col gap-3">
          <AccountFact
            icon="phone"
            label="Primary phone"
            value={
              person.contacts.find((c) => c.channel === 'phone' && c.isPrimary)
                ?.value ?? user?.phoneE164 ?? 'Not on file'
            }
          />
          <AccountFact
            icon="mail"
            label="Primary email"
            value={
              person.contacts.find((c) => c.channel === 'email' && c.isPrimary)
                ?.value ?? user?.email ?? 'Not on file'
            }
          />
          <AccountFact
            icon="key"
            label="PIN"
            value="Hidden — ask your church office to reset it"
          />
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
            <CardTitle>Your information is private</CardTitle>
            <CardSubtitle>
              We never share your details with other churches. Giving, attendance,
              and pastoral notes are always private to you and your church team.
            </CardSubtitle>
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
