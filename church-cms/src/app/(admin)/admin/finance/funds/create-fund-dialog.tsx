'use client';

import { useId, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Button,
  Dialog,
  DialogFooter,
  Field,
  Input,
  Select,
} from '@/app/_ekklesia/ui';
import type { Fund } from '../../../_lib/api-types';
import { t, tk } from '@/app/_ekklesia/i18n/core';

interface CreateFundDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (fund: Fund) => void;
}

const FUND_TYPES = [
  { value: 'unrestricted', label: tk('Unrestricted (general)') },
  { value: 'restricted', label: tk('Restricted') },
  { value: 'designated', label: tk('Designated') },
];

export function CreateFundDialog({
  open,
  onClose,
  onCreated,
}: CreateFundDialogProps): React.ReactElement {
  const formId = useId();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [fundType, setFundType] = useState('unrestricted');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const reset = (): void => {
    setCode('');
    setName('');
    setFundType('unrestricted');
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
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const created = await apiFetch<Fund>('/api/v1/funds', {
        method: 'POST',
        json: {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          fundType,
        },
      });
      reset();
      onCreated(created);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as
          | {
              details?: Array<{ field: string; message: string }>;
              error?: string;
            }
          | null;
        if (body?.details?.length) {
          const next: Record<string, string> = {};
          for (const d of body.details) {
            if (d.field && d.message) next[d.field] = d.message;
          }
          setFieldErrors(next);
        }
        setFormError(body?.error ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : t('Could not create fund.'),
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('New fund')}
      description={t('Funds categorise giving — e.g. a general fund for weekly offerings and a project fund for a building campaign.')}
      size="sm"
      footer={
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            {t('Cancel')}
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {submitting ? t('Saving…') : t('Create fund')}
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

        <Field
          label={t('Code')}
          required
          hint={t('Short identifier — letters, digits, underscore. Shown in ledgers.')}
          error={fieldErrors.code}
        >
          <Input
            data-autofocus
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t('GENERAL')}
            maxLength={50}
          />
        </Field>

        <Field label={t('Name')} required error={fieldErrors.name}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('General Fund')}
            maxLength={200}
          />
        </Field>

        <Field label={t('Type')} error={fieldErrors.fundType}>
          <Select value={fundType} onChange={(e) => setFundType(e.target.value)}>
            {FUND_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.label)}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Dialog>
  );
}
