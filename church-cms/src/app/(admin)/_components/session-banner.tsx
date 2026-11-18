'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/app/_ekklesia/session';
import { Button } from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import {
  formatApiErrorMessage,
  formatApiErrorTitle,
} from '@/i18n/api-error-message';

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
  const t = useTranslations('ApiErrors');
  const tCommon = useTranslations('Common');
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return <></>;

  const code = error instanceof ApiError ? error.code : undefined;
  const title = formatApiErrorTitle(code, t);
  const message = formatApiErrorMessage(error, t);

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
        aria-label={tCommon('close')}
      >
        <Icon name="close" size={14} />
      </Button>
    </div>
  );
}
