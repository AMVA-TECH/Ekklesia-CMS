'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { apiFetch, ApiError, normalizePhoneE164 } from '@/app/_ekklesia/session';
import {
  Button,
  Dialog,
  DialogFooter,
  Field,
  Input,
} from '@/app/_ekklesia/ui';
import type { Household } from '../../../_lib/api-types';
import { extractValidationErrors } from '../../people/form-errors';

interface EditHouseholdDialogProps {
  open: boolean;
  household: Household;
  onClose: () => void;
  onSaved: (household: Household) => void;
}

/** Edit household fields — `PATCH /api/v1/households/:id`. */
export function EditHouseholdDialog({
  open,
  household,
  onClose,
  onSaved,
}: EditHouseholdDialogProps): React.ReactElement {
  const formId = useId();
  const [label, setLabel] = useState(household.label);
  const [sharedAddress, setSharedAddress] = useState(
    household.sharedAddress ?? '',
  );
  const [emergencyContactName, setEmergencyContactName] = useState(
    household.emergencyContactName ?? '',
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    household.emergencyContactPhone ?? '',
  );
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLabel(household.label);
    setSharedAddress(household.sharedAddress ?? '');
    setEmergencyContactName(household.emergencyContactName ?? '');
    setEmergencyContactPhone(household.emergencyContactPhone ?? '');
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, household]);

  const handleClose = (): void => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    if (!label.trim()) {
      setFieldErrors({ label: 'Please enter a household label.' });
      return;
    }
    const phone = emergencyContactPhone.trim()
      ? normalizePhoneE164(emergencyContactPhone)
      : '';
    if (phone && !/^\+[1-9]\d{6,14}$/.test(phone)) {
      setFieldErrors({
        emergencyContactPhone: 'Use E.164 format, e.g. +255712345678.',
      });
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const updated = await apiFetch<Household>(
        `/api/v1/households/${household.id}`,
        {
          method: 'PATCH',
          json: {
            label: label.trim(),
            sharedAddress: sharedAddress.trim() ? sharedAddress.trim() : null,
            emergencyContactName: emergencyContactName.trim()
              ? emergencyContactName.trim()
              : null,
            emergencyContactPhone: phone || null,
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
          err instanceof Error ? err.message : 'Could not save household.',
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
      title="Edit household"
      description="Update the household label, address, and emergency contact."
      size="md"
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={submitting}
            iconLeft={submitting ? undefined : 'check'}
          >
            {submitting ? 'Saving…' : 'Save changes'}
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

        <Field label="Label" required error={fieldErrors.label}>
          <Input
            data-autofocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={200}
          />
        </Field>

        <Field label="Shared address" error={fieldErrors.sharedAddress}>
          <Input
            value={sharedAddress}
            onChange={(e) => setSharedAddress(e.target.value)}
            maxLength={500}
          />
        </Field>

        <Field
          label="Emergency contact name"
          error={fieldErrors.emergencyContactName}
        >
          <Input
            value={emergencyContactName}
            onChange={(e) => setEmergencyContactName(e.target.value)}
            maxLength={200}
          />
        </Field>

        <Field
          label="Emergency contact phone"
          hint="E.164, e.g. +255712345678"
          error={fieldErrors.emergencyContactPhone}
        >
          <Input
            type="tel"
            value={emergencyContactPhone}
            onChange={(e) => setEmergencyContactPhone(e.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  );
}
