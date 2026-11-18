'use client';

import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Button,
  Dialog,
  DialogFooter,
  Field,
  Input,
  Select,
  Textarea,
} from '@/app/_ekklesia/ui';
import type { Fund, Offering } from '../../../_lib/api-types';
import { asList } from '../../../_lib/list';
import { extractValidationErrors } from '../../people/form-errors';

interface AccountOption {
  id: string;
  code: string;
  name: string;
  accountType: string;
}

interface CreateOfferingDialogProps {
  open: boolean;
  funds: readonly Fund[];
  onClose: () => void;
  onCreated: (offering: Offering) => void;
}

export function CreateOfferingDialog({
  open,
  funds,
  onClose,
  onCreated,
}: CreateOfferingDialogProps): React.ReactElement {
  const tf = useTranslations('AdminFinance');
  const tc = useTranslations('Common');
  const formId = useId();
  // Empty until the dialog opens: reading the clock during render breaks
  // Cache Components prerendering of /admin/finance/offerings.
  const [serviceDate, setServiceDate] = useState('');
  const [amount, setAmount] = useState('');
  const [fundId, setFundId] = useState('');
  const [incomeAccountId, setIncomeAccountId] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [note, setNote] = useState('');
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const payload = await apiFetch<
          AccountOption[] | { data: AccountOption[] }
        >('/api/v1/accounts');
        setAccounts(asList(payload));
      } catch {
        setAccounts([]);
      }
    })();
  }, [open]);

  // Default the service date to today each time the dialog opens (client
  // only, adjusted during render).
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && !serviceDate) {
      setServiceDate(new Date().toISOString().slice(0, 10));
    }
  }

  const incomeAccounts = useMemo(
    () => accounts.filter((a) => a.accountType === 'income'),
    [accounts],
  );
  const depositAccounts = useMemo(
    () => accounts.filter((a) => a.accountType === 'asset'),
    [accounts],
  );

  const reset = (): void => {
    setServiceDate('');
    setAmount('');
    setFundId('');
    setIncomeAccountId('');
    setDepositAccountId('');
    setNote('');
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
  };

  const handleClose = (): void => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setFieldErrors({ amountMinor: tf('amountGreaterThanZero') });
      return;
    }
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    const payload: Record<string, unknown> = {
      serviceDate,
      amountMinor: Math.round(amountNumber * 100),
    };
    if (fundId) payload.fundId = fundId;
    if (incomeAccountId) payload.incomeAccountId = incomeAccountId;
    if (depositAccountId) payload.depositAccountId = depositAccountId;
    if (note.trim()) payload.note = note.trim();

    try {
      const created = await apiFetch<Offering>('/api/v1/offerings', {
        method: 'POST',
        json: payload,
      });
      reset();
      onCreated(created);
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.formError ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : tf('couldNotRecordOffering'),
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={tf('recordOfferingTitle')}
      description={tf('recordOfferingDesc')}
      size="sm"
      footer={
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            {tc('cancel')}
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {submitting ? tf('saving') : tf('saveOffering')}
          </Button>
        </DialogFooter>
      }
    >
      <form
        id={formId}
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="flex flex-col gap-4"
      >
        {formError ? (
          <div
            role="alert"
            className="rounded-md border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--danger-ink)]"
          >
            {formError}
          </div>
        ) : null}

        <Field label={tf('serviceDate')} required error={fieldErrors.serviceDate}>
          <Input
            type="date"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
            required
          />
        </Field>

        <Field
          label={tf('amount')}
          required
          hint={tf('amountHint')}
          error={fieldErrors.amountMinor}
        >
          <Input
            data-autofocus
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>

        <Field label={tf('fund')} hint={tc('optional')} error={fieldErrors.fundId}>
          <Select value={fundId} onChange={(e) => setFundId(e.target.value)}>
            <option value="">{tf('unassigned')}</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.code})
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={tf('incomeAccount')}
          hint={tf('incomeAccountHint')}
          error={fieldErrors.incomeAccountId}
        >
          <Select
            value={incomeAccountId}
            onChange={(e) => setIncomeAccountId(e.target.value)}
          >
            <option value="">{tf('notSet')}</option>
            {incomeAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={tf('depositAccount')}
          hint={tf('depositAccountHint')}
          error={fieldErrors.depositAccountId}
        >
          <Select
            value={depositAccountId}
            onChange={(e) => setDepositAccountId(e.target.value)}
          >
            <option value="">{tf('notSet')}</option>
            {depositAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={tf('note')} error={fieldErrors.note}>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={tf('optionalNotePlaceholder')}
          />
        </Field>
      </form>
    </Dialog>
  );
}
