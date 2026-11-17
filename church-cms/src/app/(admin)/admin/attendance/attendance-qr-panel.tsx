'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import { Button, Field, Input } from '@/app/_ekklesia/ui';
import { formatDateTime } from '../../_lib/format';

interface QrIssueResponse {
  sessionId: string;
  token: string;
  expiresAt: string;
}

interface AttendanceQrPanelProps {
  sessionId: string;
  /** When false, hide issue controls (finalized sessions). */
  canIssue: boolean;
  /** Prefer opening the check-in URL in a new tab for projector preview. */
  eventTitle?: string;
}

/** API max is 24h (`expiresInMinutes` ≤ 1440). */
const EXPIRES_IN_MINUTES = 24 * 60;

/**
 * Issue a session QR token and render a scannable code that points at the
 * public `/check-in?token=…` page.
 *
 * Backend: `POST /api/v1/attendance-sessions/:id/qr`
 */
export function AttendanceQrPanel({
  sessionId,
  canIssue,
  eventTitle,
}: AttendanceQrPanelProps): React.ReactElement {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [checkInUrl, setCheckInUrl] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderQr = useCallback(async (rawToken: string): Promise<void> => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/check-in?token=${encodeURIComponent(rawToken)}`
        : `/check-in?token=${encodeURIComponent(rawToken)}`;
    setCheckInUrl(url);
    const png = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 1024,
      color: { dark: '#1c1917', light: '#ffffff' },
    });
    setDataUrl(png);
  }, []);

  const issue = useCallback(async (): Promise<void> => {
    if (!canIssue) return;
    setIssuing(true);
    setError(null);
    setCopied(false);
    try {
      const issued = await apiFetch<QrIssueResponse>(
        `/api/v1/attendance-sessions/${sessionId}/qr`,
        {
          method: 'POST',
          json: { expiresInMinutes: EXPIRES_IN_MINUTES },
        },
      );
      setToken(issued.token);
      setExpiresAt(issued.expiresAt);
      await renderQr(issued.token);
    } catch (err) {
      setToken(null);
      setExpiresAt(null);
      setDataUrl(null);
      setCheckInUrl(null);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not issue attendance QR.',
      );
    } finally {
      setIssuing(false);
    }
  }, [canIssue, renderQr, sessionId]);

  useEffect(() => {
    setToken(null);
    setExpiresAt(null);
    setDataUrl(null);
    setCheckInUrl(null);
    setCopied(false);
    setError(null);
    if (!canIssue) return;
    void issue();
  }, [sessionId, canIssue, issue]);

  const handleCopy = async (): Promise<void> => {
    if (!checkInUrl) return;
    try {
      await navigator.clipboard.writeText(checkInUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy the check-in link. Select and copy it manually.');
    }
  };

  const handleDownload = (): void => {
    if (!dataUrl) return;
    const safeTitle = (eventTitle ?? 'attendance')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `${safeTitle || 'attendance'}-check-in-qr.png`;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  if (!canIssue && !token) {
    return (
      <p className="text-sm text-muted-foreground">
        QR check-in is only available while the session is open.
      </p>
    );
  }

  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="attendance-qr-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3
            id="attendance-qr-heading"
            className="text-sm font-medium text-foreground"
          >
            Attendance QR
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Guests scan this code to check in
            {eventTitle ? ` for ${eventTitle}` : ''}. Valid for 24 hours.
          </p>
        </div>
        {canIssue ? (
          <Button
            size="sm"
            variant="secondary"
            loading={issuing}
            onClick={() => {
              void issue();
            }}
          >
            {issuing ? 'Generating…' : token ? 'New QR' : 'Generate QR'}
          </Button>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--danger-ink)]"
        >
          {error}
        </div>
      ) : null}

      {issuing && !dataUrl ? (
        <p className="text-sm text-muted-foreground">Generating QR…</p>
      ) : null}

      {dataUrl && checkInUrl ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-surface-muted/40 p-4 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt="Attendance check-in QR code"
            width={280}
            height={280}
            className="h-[180px] w-[180px] shrink-0 rounded-md bg-white p-2 shadow-sm sm:h-[200px] sm:w-[200px]"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {expiresAt ? (
              <p className="text-xs text-muted-foreground">
                Expires {formatDateTime(expiresAt)}
              </p>
            ) : null}
            <Field label="Check-in link" hint="Share if someone cannot scan.">
              <Input readOnly value={checkInUrl} aria-label="Check-in link" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={handleDownload}>
                Download QR
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void handleCopy();
                }}
              >
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  window.open(checkInUrl, '_blank', 'noopener,noreferrer');
                }}
              >
                Open check-in
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
