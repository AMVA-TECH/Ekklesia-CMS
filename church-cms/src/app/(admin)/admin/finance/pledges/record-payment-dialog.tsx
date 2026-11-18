'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
      title="Record pledge payment"
      description={`${pledgerName} pledged ${formatMoney(pledge.amountMinor, pledge.currency)}; ${formatMoney(outstanding, pledge.currency)} is still owed.`}
      submitLabel="Record payment"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!journalId) e.journalId = 'Choose the posted entry where this money was recorded.';
        const minor = toMinorUnits(amount);
        if (minor === null) e.amountMinor = 'Enter an amount greater than zero.';
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
            label="Received in"
            required
            hint="Record the money as an offering or journal and post it first, then link it here."
            error={errors.journalId}
          >
            <Select data-autofocus value={journalId} onChange={(e) => setJournalId(e.target.value)}>
              <option value="">
                {journals.loading
                  ? 'Loading posted entries…'
                  : options.length === 0
                    ? 'No posted entries yet'
                    : 'Choose a posted entry…'}
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
              Nothing posted yet.{' '}
              <Link href="/admin/finance/offerings" className="underline">
                Record an offering
              </Link>{' '}
              or{' '}
              <Link href="/admin/finance/journals" className="underline">
                post a journal
              </Link>
              .
            </p>
          ) : null}
          <Field label={`Amount (${pledge.currency})`} required error={errors.amountMinor}>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
