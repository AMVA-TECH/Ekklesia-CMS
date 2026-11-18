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
import type { Person } from '../../../_lib/api-types';
import { extractValidationErrors } from '../form-errors';
import { t, tk } from '@/app/_ekklesia/i18n/core';

interface EditPersonDialogProps {
  open: boolean;
  person: Person;
  onClose: () => void;
  onSaved: (person: Person) => void;
}

const LOCALES: Array<{ value: string; label: string }> = [
  { value: 'en', label: tk('English') },
  { value: 'sw', label: tk('Kiswahili') },
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

  // Reset the form when the dialog opens or its subject changes — adjusted
  // during render (React's prop-change pattern) instead of in an effect.
  const [resetFor, setResetFor] = useState({ open: false, person });
  if (resetFor.open !== open || resetFor.person !== person) {
    setResetFor({ open, person });
    if (open) {
      setDisplayName(person.displayName);
      setFullName(person.fullName ?? '');
      setDateOfBirth(person.dateOfBirth ?? '');
      setLocale(person.preferredLocale || 'en');
      setDirectoryOptIn(person.directoryOptIn);
      setFieldErrors({});
      setFormError(null);
      setSubmitting(false);
    }
  }

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
          err instanceof Error ? err.message : t('Could not save this person.'),
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
      title={t('Edit person')}
      description={t('Update how this person appears in the church directory.')}
      size="md"
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={submitting}
            iconLeft={submitting ? undefined : 'check'}
          >
            {submitting ? t('Saving…') : t('Save changes')}
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

        <Field label={t('Display name')} required error={fieldErrors.displayName}>
          <Input
            data-autofocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={200}
          />
        </Field>

        <Field label={t('Full name')} error={fieldErrors.fullName}>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={300}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={t('Date of birth')}
            hint={t('YYYY-MM-DD')}
            error={fieldErrors.dateOfBirth}
          >
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </Field>
          <Field label={t('Preferred language')} error={fieldErrors.preferredLocale}>
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              {LOCALES.map((l) => (
                <option key={l.value} value={l.value}>
                  {t(l.label)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={t('Visibility')}>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={directoryOptIn}
              onChange={(e) => setDirectoryOptIn(e.target.checked)}
              className="h-4 w-4 rounded-sm border-border text-foreground focus-ring"
            />
            {t('Show in church directory')}
          </label>
        </Field>
      </form>
    </Dialog>
  );
}
