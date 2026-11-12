'use client';

import { useState } from 'react';
import { ApiError } from '@/app/_ekklesia/session';
import { Button } from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';

interface SessionBannerProps {
  error: ApiError | Error;
}

/**
 * Non-blocking banner shown when `/api/v1/auth/me` fails.
 *
 * In dev with `ALLOW_DEV_AUTH=1` this most commonly means the browser hasn't
 * been given `x-dev-*` identity headers yet; in production it indicates a
 * missing or expired session. Either way we surface the hint inline instead
 * of trapping the page in a loading state.
 */
export function SessionBanner({ error }: SessionBannerProps): React.ReactElement {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return <></>;

  const status = error instanceof ApiError ? error.status : undefined;
  const title =
    status === 401
      ? 'Signed out'
      : status === 403
        ? 'Session needs attention'
        : 'Could not load your session';
  const message =
    status === 401
      ? 'Please sign in again to continue using the admin console.'
      : error.message;

  return (
    <div
      role="status"
      className="flex items-start gap-3 px-4 py-3 text-sm text-foreground"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color:var(--warning-soft)] text-[color:var(--warning-ink)]"
      >
        <Icon name="alert" size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{message}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <Icon name="close" size={14} />
      </Button>
    </div>
  );
}
