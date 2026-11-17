'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  TANZANIA_PHONE_HINT,
  TANZANIA_PHONE_INVALID_MESSAGE,
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
    if (q.length < 2) {
      setHits([]);
      return;
    }
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
      next.firstName = 'Enter your first name.';
    }
    if (lastName.trim().length < 1) {
      next.lastName = 'Enter your last name.';
    }
    const emailTrim = email.trim();
    const phoneTrim = phone.trim();
    if (!phoneTrim) {
      next.phone = 'Enter your phone number.';
    } else if (!normalizeTanzaniaPhoneE164(phoneTrim)) {
      next.phone = TANZANIA_PHONE_INVALID_MESSAGE;
    }
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      next.email = 'That email does not look right.';
    }
    if (!church) {
      next.church = 'Select the church you want to be attached to.';
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
        throw new Error(body?.detail || body?.title || 'Request failed');
      }
      const payload = body.data ?? body;
      setSuccess({
        churchName: church.name,
        message:
          payload.message ||
          'Your registration was received. A church administrator must attach you before you can use church services.',
      });
      setSuccessOpen(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
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
          Request to join
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us who you are and which church to attach to. Attachment unlocks
          that church’s services after an admin approves you. This does not sign
          you in — use Sign in with your phone and PIN once approved.
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
            <p className="font-semibold">Registration received</p>
            <p className="mt-1 opacity-90">
              Waiting for {success.churchName} to attach you. You will be able
              to sign in after approval.
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
          <Field label="First name" required error={fieldErrors.firstName}>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              maxLength={60}
              disabled={Boolean(success)}
            />
          </Field>
          <Field label="Last name" required error={fieldErrors.lastName}>
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
          label="Phone"
          required
          hint={`${TANZANIA_PHONE_HINT} Used to sign in after approval.`}
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

        <Field label="Email" hint="Optional" error={fieldErrors.email}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            disabled={Boolean(success)}
          />
        </Field>

        <Field
          label="Church to attach to"
          required
          hint={
            church
              ? 'Attachment connects you to this church’s services after approval'
              : 'Type at least 2 letters to find your church'
          }
          error={fieldErrors.church}
        >
          {church ? (
            <div className="flex items-center gap-2">
              <Input
                value={church.name}
                readOnly
                aria-label="Selected church"
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
                  Change
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="relative">
              <Input
                value={churchQuery}
                onChange={(e) => {
                  setChurchQuery(e.target.value);
                  setFieldErrors((f) => ({ ...f, church: undefined }));
                }}
                placeholder="Search church name"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={hits.length > 0}
              />
              {searching ? (
                <p className="mt-1 text-xs text-muted-foreground">Searching…</p>
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

        <Field label="Language">
          <Select
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'en' | 'sw')}
            disabled={Boolean(success)}
          >
            <option value="sw">Kiswahili</option>
            <option value="en">English</option>
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
            ? 'Sending request…'
            : success
              ? 'Request sent'
              : 'Submit join request'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already approved?{' '}
        <Link
          href="/sign-in"
          className="link-ink font-medium underline-offset-2 hover:underline focus-ring rounded-sm"
        >
          Sign in
        </Link>
      </p>

      <Dialog
        open={successOpen && Boolean(success)}
        onClose={closeSuccessDialog}
        title="Registration successful"
        description="Your request was received. You are not signed in yet."
        size="sm"
        hideCloseButton
        footer={
          <DialogFooter>
            <Button variant="secondary" onClick={closeSuccessDialog}>
              Stay here
            </Button>
            <Button
              data-autofocus
              onClick={() => {
                setSuccessOpen(false);
                router.push('/sign-in');
              }}
            >
              Go to sign in
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
                Success
              </p>
              <p className="mt-1 text-[color:var(--success-ink)] opacity-90">
                {success.message}
              </p>
            </div>
            <div className="rounded-xl border-2 border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-tint)] px-3 py-3">
              <p className="font-semibold text-[color:var(--brand-gold-ink)]">
                Waiting for attachment
              </p>
              <p className="mt-1 text-sm text-[color:var(--brand-gold-ink)] opacity-90">
                <strong>{success.churchName}</strong> must approve and attach
                you before church services unlock. After that, sign in with
                your phone and the PIN they give you.
              </p>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={failureOpen && Boolean(error)}
        onClose={closeFailureDialog}
        title="Registration failed"
        description="Something went wrong. Your request was not sent."
        size="sm"
        hideCloseButton
        footer={
          <DialogFooter>
            <Button data-autofocus onClick={closeFailureDialog}>
              Try again
            </Button>
          </DialogFooter>
        }
      >
        <div className="flex flex-col items-center rounded-2xl border-2 border-[color:var(--danger)] bg-[color:var(--danger-soft)] px-4 py-5 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--danger)] text-white shadow-sm">
            <Icon name="alert-circle" size={36} />
          </span>
          <p className="mt-3 text-base font-semibold text-[color:var(--danger-ink)]">
            Failed
          </p>
          <p className="mt-1 text-[color:var(--danger-ink)] opacity-90">
            {error}
          </p>
        </div>
      </Dialog>
    </div>
  );
}
