'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ApiError,
  apiFetch,
  resolvePostAuthPath,
  sanitizeAppRedirect,
} from '@/app/_ekklesia/session';
import {
  Button,
  Field,
  Input,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * MFA OTP verification — same split auth shell as sign-in (FundFlow panel rhythm).
 */
export function VerifyClient(): React.ReactElement {
  const router = useRouter();
  const params = useSearchParams();
  const requestedRedirect = sanitizeAppRedirect(params?.get('redirect'));

  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [tick, setTick] = useState(0);
  const sentOnceRef = useRef(false);

  useEffect(() => {
    if (sentOnceRef.current) return;
    sentOnceRef.current = true;
    void sendOtp(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  async function sendOtp(silent = false): Promise<void> {
    if (sending) return;
    const now = Date.now();
    if (cooldownUntil > now) return;
    setSending(true);
    setError(null);
    try {
      await apiFetch('/api/v1/auth/mfa/send-otp', {
        method: 'POST',
        json: {},
        skipDevAuth: true,
      });
      setCooldownUntil(now + RESEND_COOLDOWN_SECONDS * 1000);
      setNotice(
        silent
          ? 'We sent a 6-digit code to your phone or email.'
          : 'A fresh code is on the way.',
      );
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401 || e.status === 403) {
          router.push('/sign-in');
          return;
        }
        setError(e.message || 'We could not send a new code just now.');
      } else {
        setError('Check your connection and try again.');
      }
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setFieldError(undefined);
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setFieldError('The code is 6 digits.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/v1/auth/mfa/verify', {
        method: 'POST',
        json: { code: trimmed, trustDevice },
        skipDevAuth: true,
      });
      const destination = await resolvePostAuthPath(requestedRedirect);
      router.push(destination);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 400 || e.status === 401 || e.status === 422) {
          setFieldError('That code did not match. Check for typos or ask for a new one.');
        } else if (e.status === 429) {
          setError('Too many attempts. Please wait a minute.');
        } else {
          setError(e.message || 'We could not verify that code.');
        }
      } else {
        setError('Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const secondsRemaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  const canResend = secondsRemaining === 0 && !sending;
  void tick;

  return (
    <div className="flex flex-col">
      <div className="mb-8 text-center lg:text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
          One more step
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the 6-digit code we sent to keep your church account safe.
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <Field label="6-digit code" required error={fieldError}>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
            maxLength={6}
            className="text-center text-lg tracking-[0.4em]"
            autoFocus
          />
        </Field>

        <label className="flex items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(e) => setTrustDevice(e.target.checked)}
            className="mt-1 h-4 w-4 rounded-sm border-border accent-[color:var(--brand-gold-ink)] focus-ring"
          />
          <span>
            Trust this device for a while
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Only turn this off on shared or public phones.
            </span>
          </span>
        </label>

        {notice && !error ? (
          <div
            className="flex items-start gap-2 rounded-xl border border-[color:var(--info-soft)] bg-[color:var(--info-soft)] px-3 py-2.5 text-sm text-[color:var(--info-ink)]"
            role="status"
          >
            <Icon name="info" size={16} className="mt-0.5 shrink-0" />
            <span>{notice}</span>
          </div>
        ) : null}

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
          {submitting ? 'Verifying…' : 'Verify and continue'}
        </Button>

        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => void sendOtp(false)}
            disabled={!canResend}
            className="link-ink inline-flex items-center gap-1 font-medium disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:text-muted-foreground focus-ring rounded-sm"
          >
            <Icon name="refresh" size={14} />
            {sending
              ? 'Sending…'
              : canResend
                ? 'Send a new code'
                : `Send a new code in ${secondsRemaining}s`}
          </button>
          <Link
            href="/sign-in"
            className="link-ink text-xs underline-offset-2 hover:underline focus-ring rounded-sm"
          >
            Use a different phone or email
          </Link>
        </div>
      </form>
    </div>
  );
}
