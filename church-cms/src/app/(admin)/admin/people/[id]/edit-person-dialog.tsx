'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
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

interface EditPersonDialogProps {
  open: boolean;
  person: Person;
  onClose: () => void;
  onSaved: (person: Person) => void;
}

const LOCALES: Array<{ value: string; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Kiswahili' },
];

/**
 * Admin identity edit — maps to `PATCH /api/v1/people/:id`
 * (`updatePersonBodySchema`: name, DOB, locale, directory — not contacts).
 */
export function EditPersonDialog({
  open,
  person,
  onClose,
  onSaved,
}: EditPersonDialogProps): React.ReactElement {
  const formId = useId();
  const [displayName, setDisplayName] = useState(person.displayName);
  const [fullName, setFullName] = useState(person.fullName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(person.dateOfBirth ?? '');
  const [locale, setLocale] = useState(person.preferredLocale || 'en');
  const [directoryOptIn, setDirectoryOptIn] = useState(person.directoryOptIn);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDisplayName(person.displayName);
    setFullName(person.fullName ?? '');
    setDateOfBirth(person.dateOfBirth ?? '');
    setLocale(person.preferredLocale || 'en');
    setDirectoryOptIn(person.directoryOptIn);
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, person]);

  const handleClose = (): void => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      displayName: displayName.trim(),
      preferredLocale: locale,
      directoryOptIn,
      fullName: fullName.trim() ? fullName.trim() : null,
      dateOfBirth: dateOfBirth.trim() ? dateOfBirth.trim() : null,
    };

    try {
      const updated = await apiFetch<Person>(`/api/v1/people/${person.id}`, {
        method: 'PATCH',
        json: payload,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.formError ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Could not save this person.',
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
      title="Edit person"
      description="Update how this person appears in the church directory."
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

        <Field label="Display name" required error={fieldErrors.displayName}>
          <Input
            data-autofocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={200}
          />
        </Field>

        <Field label="Full name" error={fieldErrors.fullName}>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={300}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Date of birth"
            hint="YYYY-MM-DD"
            error={fieldErrors.dateOfBirth}
          >
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </Field>
          <Field label="Preferred language" error={fieldErrors.preferredLocale}>
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              {LOCALES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Visibility">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={directoryOptIn}
              onChange={(e) => setDirectoryOptIn(e.target.checked)}
              className="h-4 w-4 rounded-sm border-border text-foreground focus-ring"
            />
            Show in church directory
          </label>
        </Field>
      </form>
    </Dialog>
  );
}
