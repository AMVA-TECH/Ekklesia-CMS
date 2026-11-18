'use client';

import { useState } from 'react';
import { apiFetch } from '@/app/_ekklesia/session';
import { Button, Field, Input, Select } from '@/app/_ekklesia/ui';
import type { Fund } from '../../../_lib/api-types';
import { FormDialog } from '../../../_components/kit';
import { todayLocalIso, toMinorUnits } from '../../../_lib/errors';
import { formatMoney } from '../../../_lib/format';
import { accountLabel, type Account, type FinancialYear } from '../_lib/finance-types';
import { t } from '@/app/_ekklesia/i18n/core';

interface LineDraft {
  key: number;
  accountId: string;
  fundId: string;
  debit: string;
  credit: string;
  memo: string;
}

let nextKey = 1;
const blankLine = (): LineDraft => ({
  key: nextKey++,
  accountId: '',
  fundId: '',
  debit: '',
  credit: '',
  memo: '',
});

export function CreateJournalDialog({
  accounts,
  funds,
  years,
  onClose,
  onCreated,
}: {
  accounts: Account[];
  funds: Fund[];
  years: FinancialYear[];
  onClose: () => void;
  onCreated: () => void;
}): React.ReactElement {
  const [yearId, setYearId] = useState(years[0]?.id ?? '');
  const [entryNumber, setEntryNumber] = useState('');
  const [journalDate, setJournalDate] = useState(todayLocalIso);
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<LineDraft[]>(() => [blankLine(), blankLine()]);

  const minor = (v: string): number => (v.trim() ? (toMinorUnits(v) ?? 0) : 0);
  const debits = lines.reduce((s, l) => s + minor(l.debit), 0);
  const credits = lines.reduce((s, l) => s + minor(l.credit), 0);
  const balanced = debits > 0 && debits === credits;

  const update = (key: number, patch: Partial<LineDraft>): void =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <FormDialog
      title={t('New journal')}
      description={t('Saved as a draft. Post it from the list once it balances.')}
      submitLabel={t('Save draft')}
      size="lg"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!yearId) e.financialYearId = t('Create or open a financial year first.');
        if (!entryNumber.trim()) e.entryNumber = t('Enter an entry number, e.g. JV-0001.');
        if (lines.some((l) => !l.accountId)) e.lines = t('Every line needs an account.');
        else if (lines.some((l) => (minor(l.debit) > 0) === (minor(l.credit) > 0)))
          e.lines = t('Each line needs either a debit or a credit amount.');
        else if (!balanced) e.lines = t('Debits and credits must be equal.');
        return e;
      }}
      onSubmit={async () => {
        await apiFetch('/api/v1/journals', {
          method: 'POST',
          json: {
            financialYearId: yearId,
            entryNumber: entryNumber.trim(),
            journalDate,
            ...(memo.trim() ? { memo: memo.trim() } : {}),
            lines: lines.map((l) => ({
              accountId: l.accountId,
              ...(l.fundId ? { fundId: l.fundId } : {}),
              debitMinor: minor(l.debit),
              creditMinor: minor(l.credit),
              ...(l.memo.trim() ? { memo: l.memo.trim() } : {}),
            })),
          },
        });
        onCreated();
      }}
    >
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('Financial year')} required error={errors.financialYearId}>
              <Select value={yearId} onChange={(e) => setYearId(e.target.value)}>
                {years.length === 0 ? <option value="">{t('No open year')}</option> : null}
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {t(y.label)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Entry number')} required error={errors.entryNumber}>
              <Input
                data-autofocus
                value={entryNumber}
                onChange={(e) => setEntryNumber(e.target.value)}
                placeholder={t('JV-0001')}
                maxLength={50}
              />
            </Field>
            <Field label={t('Date')} required error={errors.journalDate}>
              <Input
                type="date"
                value={journalDate}
                onChange={(e) => setJournalDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label={t('Memo')} error={errors.memo}>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={500} />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-foreground">{t('Lines')}</legend>
            {lines.map((l, i) => (
              <div
                key={l.key}
                className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[2fr_1.2fr_1fr_1fr_auto]"
              >
                <Select
                  aria-label={t('Line {0} account', i + 1)}
                  value={l.accountId}
                  onChange={(e) => update(l.key, { accountId: e.target.value })}
                >
                  <option value="">{t('Account…')}</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {accountLabel(a)}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label={t('Line {0} fund', i + 1)}
                  value={l.fundId}
                  onChange={(e) => update(l.key, { fundId: e.target.value })}
                >
                  <option value="">{t('No fund')}</option>
                  {funds.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
                <Input
                  aria-label={t('Line {0} debit', i + 1)}
                  inputMode="decimal"
                  placeholder={t('Debit')}
                  value={l.debit}
                  onChange={(e) => update(l.key, { debit: e.target.value, credit: '' })}
                />
                <Input
                  aria-label={t('Line {0} credit', i + 1)}
                  inputMode="decimal"
                  placeholder={t('Credit')}
                  value={l.credit}
                  onChange={(e) => update(l.key, { credit: e.target.value, debit: '' })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft="trash"
                  aria-label={t('Remove line {0}', i + 1)}
                  disabled={lines.length <= 2}
                  onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                />
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="secondary"
                size="sm"
                iconLeft="plus"
                onClick={() => setLines((ls) => [...ls, blankLine()])}
              >
                {t('Add line')}
              </Button>
              <p
                className={
                  balanced
                    ? 'text-sm text-[color:var(--success-ink)]'
                    : 'text-sm text-muted-foreground'
                }
              >
                {t('Debits')} {formatMoney(debits)} {t('· Credits')} {formatMoney(credits)}
                {balanced ? (' ' + t('· Balanced')) : ''}
              </p>
            </div>
            {errors.lines ? (
              <p role="alert" className="text-sm text-[color:var(--danger-ink)]">
                {errors.lines}
              </p>
            ) : null}
          </fieldset>
        </>
      )}
    </FormDialog>
  );
}
