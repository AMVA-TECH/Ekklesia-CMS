'use client';

import { useId, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Button,
  Dialog,
  DialogFooter,
  Field,
  Input,
  Textarea,
} from '@/app/_ekklesia/ui';
import type { Household } from '../../_lib/api-types';

interface CreateHouseholdDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (household: Household) => void;
}

/**
 * Create a household with just the essentials — label + optional shared
 * contact. Member links are added from the detail page or the person side,
 * once the household exists.
 */
export function CreateHouseholdDialog({
  open,
  onClose,
  onCreated,
}: CreateHouseholdDialogProps): React.ReactElement {
  const formId = useId();
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const reset = (): void => {
    setLabel('');
    setAddress('');
    setEmergencyName('');
    setEmergencyPhone('');
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
    const payload: Record<string, unknown> = {
      label: label.trim(),
      memberPersonIds: [],
      children: [],
    };
    if (address.trim()) payload.sharedAddress = address.trim();
    if (emergencyName.trim()) payload.emergencyContactName = emergencyName.trim();
    if (emergencyPhone.trim()) payload.emergencyContactPhone = emergencyPhone.trim();

    try {
      const created = await apiFetch<Household>('/api/v1/households', {
        method: 'POST',
        json: payload,
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
          err instanceof Error ? err.message : 'Could not create this household.',
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New household"
      description="Just a label and optional shared contact details to get started. You can link people once it's created."
      size="md"
      footer={
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {submitting ? 'Saving…' : 'Create household'}
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
          label="Label"
          required
          hint="e.g. 'The Noah household' or 'Mwakimi family'."
          error={fieldErrors.label}
        >
          <Input
            data-autofocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={200}
          />
        </Field>

        <Field
          label="Shared address"
          hint="Used in pastoral visits and emergency contact."
          error={fieldErrors.sharedAddress}
        >
          <Textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={500}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Emergency contact name" error={fieldErrors.emergencyContactName}>
            <Input
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              maxLength={200}
            />
          </Field>
          <Field
            label="Emergency phone"
            hint="E.164 format, e.g. +255712345678"
            error={fieldErrors.emergencyContactPhone}
          >
            <Input
              type="tel"
              inputMode="tel"
              placeholder="+255…"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
