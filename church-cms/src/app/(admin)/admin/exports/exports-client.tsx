'use client';

import { useState } from 'react';
import { apiFetch } from '@/app/_ekklesia/session';
import { Button, Card, Field, Input, PageHeader, useToast } from '@/app/_ekklesia/ui';
import { Icon, type IconName } from '@/app/_ekklesia/icons';
import { InlineAlert } from '../../_components/kit';
import { errorMessage } from '../../_lib/errors';
import { t, tk } from '@/app/_ekklesia/i18n/core';

type Kind = 'people' | 'attendance' | 'finance';

const KINDS: Array<{ kind: Kind; title: string; icon: IconName; body: string; needsRange: boolean }> = [
  {
    kind: 'people',
    title: tk('People'),
    icon: 'users',
    body: tk('Everyone on record with their main contacts.'),
    needsRange: false,
  },
  {
    kind: 'attendance',
    title: tk('Attendance'),
    icon: 'calendar-check',
    body: tk('Attendance records for services and events in a date range.'),
    needsRange: true,
  },
  {
    kind: 'finance',
    title: tk('Finance'),
    icon: 'wallet',
    body: tk('Posted journal lines in a date range, for your accountant.'),
    needsRange: true,
  },
];

export function ExportsClient(): React.ReactElement {
  const { push } = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (kind: Kind, needsRange: boolean): Promise<void> => {
    setError(null);
    if (needsRange && (!from || !to)) {
      setError(t('Choose a from and to date for attendance and finance exports.'));
      return;
    }
    if (needsRange && from > to) {
      setError(t('The from date must be on or before the to date.'));
      return;
    }
    setBusy(kind);
    try {
      const res = await apiFetch<Response>('/api/v1/exports', {
        method: 'POST',
        json: { kind, format: 'csv', ...(needsRange ? { from, to } : {}) },
        rawResponse: true,
      });
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `${kind}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      push({
        tone: 'success',
        title: t('Export ready'),
        message: t('{0} rows in {1}.', res.headers.get('X-Export-Row-Count') ?? 'All', filename),
      });
    } catch (err) {
      setError(errorMessage(err, t('Could not create the export.')));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('Exports')}
        lede={t('Download data as CSV to open in Excel. You only see exports your role allows; every export is recorded in the audit log.')}
      />

      <div className="grid max-w-md gap-4 sm:grid-cols-2">
        <Field label={t('From')} hint={t('Attendance & finance')}>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t('To')}>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>

      {error ? <InlineAlert>{error}</InlineAlert> : null}

      <ul className="grid gap-4 md:grid-cols-3">
        {KINDS.map((k) => (
          <li key={k.kind}>
            <Card className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Icon name={k.icon} size={18} />
                {t(k.title)}
              </div>
              <p className="text-sm text-muted-foreground">{t(k.body)}</p>
              <Button
                className="mt-auto self-start"
                size="sm"
                iconLeft="download"
                loading={busy === k.kind}
                disabled={busy !== null}
                onClick={() => void download(k.kind, k.needsRange)}
              >
                {t('Download CSV')}
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
