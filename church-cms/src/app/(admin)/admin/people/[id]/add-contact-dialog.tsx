'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { apiFetch, ApiError, normalizePhoneE164 } from '@/app/_ekklesia/session';
import {
  Button,
  Dialog,
  DialogFooter,
  Field,
  Input,
  Select,
} from '@/app/_ekklesia/ui';
import type { Person } from '../../../_lib/api-types';
import { extractValidationErrors } from '../form-errors';

interface AddContactDialogProps {
  open: boolean;
  personId: string;
  onClose: () => void;
  onSaved: (person: Person) => void;
}

/**
 * Add phone/email — `POST /api/v1/people/:id/contacts`.
 */
export function AddContactDialog({
  open,
  personId,
  onClose,
  onSaved,
}: AddContactDialogProps): React.ReactElement {
  const formId = useId();
  const [channel, setChannel] = useState<'phone' | 'email'>('phone');
  const [value, setValue] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setChannel('phone');
    setValue('');
    setIsPrimary(true);
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open]);

  const handleClose = (): void => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    setFieldErrors({});
    setFormError(null);

    const normalized =
      channel === 'phone' ? normalizePhoneE164(value) : value.trim();
    if (!normalized) {
      setFieldErrors({ value: 'Please enter a contact value.' });
      return;
    }
    if (channel === 'phone' && !/^\+[1-9]\d{6,14}$/.test(normalized)) {
      setFieldErrors({
        value: 'Use international format, e.g. +255712345678.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const updated = await apiFetch<Person>(
        `/api/v1/people/${personId}/contacts`,
        {
          method: 'POST',
          json: {
            channel,
            value: normalized,
            isPrimary,
          },
        },
      );
      onSaved(updated);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.formError ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Could not add this contact.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add contact"
      description="Add a phone number or email for this person."
      size="sm"
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={submitting}
            iconLeft={submitting ? undefined : 'plus'}
          >
            {submitting ? 'Saving…' : 'Add contact'}
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

        <Field label="Channel" error={fieldErrors.channel}>
          <Select
            data-autofocus
            value={channel}
            onChange={(e) => setChannel(e.target.value as 'phone' | 'email')}
          >
            <option value="phone">Phone</option>
            <option value="email">Email</option>
          </Select>
        </Field>

        <Field
          label={channel === 'phone' ? 'Phone number' : 'Email address'}
          required
          hint={
            channel === 'phone'
              ? 'E.164 format, e.g. +255712345678'
              : undefined
          }
          error={fieldErrors.value}
        >
          <Input
            type={channel === 'phone' ? 'tel' : 'email'}
            inputMode={channel === 'phone' ? 'tel' : 'email'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={channel === 'phone' ? '+255…' : 'name@example.com'}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="h-4 w-4 rounded-sm border-border text-foreground focus-ring"
          />
          Set as primary contact
        </label>
      </form>
    </Dialog>
  );
}
