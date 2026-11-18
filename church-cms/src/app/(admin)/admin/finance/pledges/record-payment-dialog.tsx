'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/app/_ekklesia/session';
import { Field, Input, Select } from '@/app/_ekklesia/ui';
import type { Pledge } from '../../../_lib/api-types';
import { FormDialog } from '../../../_components/kit';
import { toMinorUnits } from '../../../_lib/errors';
import { formatDate, formatMoney } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import type { Journal } from '../_lib/finance-types';

/**
 * Link money already received (a posted journal — e.g. a posted offering or
 * a receipt entry) to a pledge. The pledge's received total and status
 * (open → partial → fulfilled) update server-side.
 */
export function RecordPaymentDialog({
  pledge,
  pledgerName,
  onClose,
  onRecorded,
}: {
  pledge: Pledge;
  pledgerName: string;
  onClose: () => void;
  onRecorded: (amountMinor: number) => void;
}): React.ReactElement {
  const tf = useTranslations('AdminFinance');
  const outstanding = Math.max(0, pledge.amountMinor - (pledge.appliedMinor ?? 0));
  const journals = useApiList<Journal>('/api/v1/journals?status=posted&limit=100');
  const [journalId, setJournalId] = useState('');
  const [amount, setAmount] = useState(outstanding > 0 ? String(outstanding / 100) : '');

  const options = useMemo(
    () =>
      journals.items.map((j) => ({
        id: j.id,
        label: `${j.entryNumber} · ${formatDate(j.journalDate)} · ${formatMoney(
          j.lines.reduce((s, l) => s + l.debitMinor, 0),
          j.lines[0]?.currency ?? pledge.currency,
        )}${j.memo ? ` · ${j.memo}` : ''}`,
      })),
    [journals.items, pledge.currency],
  );

  return (
    <FormDialog
      title={tf('recordPaymentTitle')}
      description={tf('recordPaymentDesc', {
        name: pledgerName,
        pledged: formatMoney(pledge.amountMinor, pledge.currency),
        owed: formatMoney(outstanding, pledge.currency),
      })}
      submitLabel={tf('recordPayment')}
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!journalId) e.journalId = tf('recordPaymentJournalRequired');
        const minor = toMinorUnits(amount);
        if (minor === null) e.amountMinor = tf('recordPaymentAmountRequired');
        return e;
      }}
      onSubmit={async () => {
        const amountMinor = toMinorUnits(amount)!;
        await apiFetch(`/api/v1/pledges/${pledge.id}/applications`, {
          method: 'POST',
          json: { journalId, amountMinor },
        });
        onRecorded(amountMinor);
      }}
    >
      {(errors) => (
        <>
          <Field
            label={tf('receivedIn')}
            required
            hint={tf('receivedInHint')}
            error={errors.journalId}
          >
            <Select data-autofocus value={journalId} onChange={(e) => setJournalId(e.target.value)}>
              <option value="">
                {journals.loading
                  ? tf('loadingPostedEntries')
                  : options.length === 0
                    ? tf('noPostedEntries')
                    : tf('choosePostedEntry')}
              </option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          {!journals.loading && options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {tf.rich('nothingPostedYet', {
                offering: (chunks) => (
                  <Link href="/admin/finance/offerings" className="underline">
                    {chunks}
                  </Link>
                ),
                journal: (chunks) => (
                  <Link href="/admin/finance/journals" className="underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          ) : null}
          <Field label={tf('amountInCurrency', { currency: pledge.currency })} required error={errors.amountMinor}>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
