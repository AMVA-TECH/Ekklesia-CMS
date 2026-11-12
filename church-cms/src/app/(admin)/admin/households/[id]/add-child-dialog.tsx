'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Button,
  Dialog,
  DialogFooter,
  Field,
  Input,
} from '@/app/_ekklesia/ui';
import type { Household } from '../../../_lib/api-types';
import { extractValidationErrors } from '../../people/form-errors';

interface AddChildDialogProps {
  open: boolean;
  householdId: string;
  onClose: () => void;
  onSaved: (household: Household) => void;
}

/**
 * Add a non-member child — `POST /api/v1/households/:id/children`.
 */
export function AddChildDialog({
  open,
  householdId,
  onClose,
  onSaved,
}: AddChildDialogProps): React.ReactElement {
  const formId = useId();
  const [name, setName] = useState('');
  const [age, setAge] = useState('5');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setAge('5');
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
    const ageNum = Number.parseInt(age, 10);
    if (!name.trim()) {
      setFieldErrors({ name: 'Please enter a name.' });
      return;
    }
    if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 17) {
      setFieldErrors({ age: 'Age must be between 0 and 17.' });
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const updated = await apiFetch<Household>(
        `/api/v1/households/${householdId}/children`,
        {
          method: 'POST',
          json: { name: name.trim(), age: ageNum },
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
          err instanceof Error ? err.message : 'Could not add this child.',
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
      title="Add a child"
      description="Record a child under 18 who does not yet have their own person record."
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
            {submitting ? 'Saving…' : 'Add child'}
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

        <Field label="Name" required error={fieldErrors.name}>
          <Input
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
          />
        </Field>

        <Field label="Age" required hint="0–17" error={fieldErrors.age}>
          <Input
            type="number"
            min={0}
            max={17}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  );
}
