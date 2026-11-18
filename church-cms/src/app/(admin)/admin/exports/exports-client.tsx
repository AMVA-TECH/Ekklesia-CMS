'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/app/_ekklesia/session';
import { Button, Card, Field, Input, PageHeader, useToast } from '@/app/_ekklesia/ui';
import { Icon, type IconName } from '@/app/_ekklesia/icons';
import { InlineAlert } from '../../_components/kit';
import { errorMessage } from '../../_lib/errors';

type Kind = 'people' | 'attendance' | 'finance';

export function ExportsClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tx = useTranslations('AdminExports');
  const { push } = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kinds = useMemo(
    (): Array<{ kind: Kind; title: string; icon: IconName; body: string; needsRange: boolean }> => [
      {
        kind: 'people',
        title: tx('peopleTitle'),
        icon: 'users',
        body: tx('peopleBody'),
        needsRange: false,
      },
      {
        kind: 'attendance',
        title: tx('attendanceTitle'),
        icon: 'calendar-check',
        body: tx('attendanceBody'),
        needsRange: true,
      },
      {
        kind: 'finance',
        title: tx('financeTitle'),
        icon: 'wallet',
        body: tx('financeBody'),
        needsRange: true,
      },
    ],
    [tx],
  );

  const download = async (kind: Kind, needsRange: boolean): Promise<void> => {
    setError(null);
    if (needsRange && (!from || !to)) {
      setError(tx('chooseRange'));
      return;
    }
    if (needsRange && from > to) {
      setError(tx('fromBeforeTo'));
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
        title: tx('exportReady'),
        message: tx('rowsInFile', {
          rows: res.headers.get('X-Export-Row-Count') ?? 'All',
          filename,
        }),
      });
    } catch (err) {
      setError(errorMessage(err, tx('couldNotCreate')));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('exports')} lede={t('exportsLede')} />

      <div className="grid max-w-md gap-4 sm:grid-cols-2">
        <Field label={tx('from')} hint={tx('fromHint')}>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={tx('to')}>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>

      {error ? <InlineAlert>{error}</InlineAlert> : null}

      <ul className="grid gap-4 md:grid-cols-3">
        {kinds.map((k) => (
          <li key={k.kind}>
            <Card className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Icon name={k.icon} size={18} />
                {k.title}
              </div>
              <p className="text-sm text-muted-foreground">{k.body}</p>
              <Button
                className="mt-auto self-start"
                size="sm"
                iconLeft="download"
                loading={busy === k.kind}
                disabled={busy !== null}
                onClick={() => void download(k.kind, k.needsRange)}
              >
                {tx('download')}
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
