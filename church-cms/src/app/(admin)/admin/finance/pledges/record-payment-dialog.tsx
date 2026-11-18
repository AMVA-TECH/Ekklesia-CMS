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
import { t } from '@/app/_ekklesia/i18n/core';

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
      title={t('Record pledge payment')}
      description={t('{0} pledged {1}; {2} is still owed.', pledgerName, formatMoney(pledge.amountMinor, pledge.currency), formatMoney(outstanding, pledge.currency))}
      submitLabel={t('Record payment')}
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!journalId) e.journalId = t('Choose the posted entry where this money was recorded.');
        const minor = toMinorUnits(amount);
        if (minor === null) e.amountMinor = t('Enter an amount greater than zero.');
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
            label={t('Received in')}
            required
            hint={t('Record the money as an offering or journal and post it first, then link it here.')}
            error={errors.journalId}
          >
            <Select data-autofocus value={journalId} onChange={(e) => setJournalId(e.target.value)}>
              <option value="">
                {journals.loading
                  ? t('Loading posted entries…')
                  : options.length === 0
                    ? t('No posted entries yet')
                    : t('Choose a posted entry…')}
              </option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {t(o.label)}
                </option>
              ))}
            </Select>
          </Field>
          {!journals.loading && options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('Nothing posted yet.')}{' '}
              <Link href="/admin/finance/offerings" className="underline">
                {t('Record an offering')}
              </Link>{' '}
              {t('or')}{' '}
              <Link href="/admin/finance/journals" className="underline">
                {t('post a journal')}
              </Link>
              .
            </p>
          ) : null}
          <Field label={t('Amount ({0})', pledge.currency)} required error={errors.amountMinor}>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
