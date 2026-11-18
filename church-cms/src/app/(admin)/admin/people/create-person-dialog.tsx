'use client';

import { useId, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Button,
  Dialog,
  DialogFooter,
  Field,
  Input,
  Select,
} from '@/app/_ekklesia/ui';
import type { Person } from '../../_lib/api-types';
import { extractValidationErrors } from './form-errors';

interface CreatePersonDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (person: Person) => void;
}

const LOCALE_VALUES = ['en', 'sw'] as const;

/**
 * Minimal "add a visitor / friend" form.
 *
 * Mirrors the validation on `createPersonBodySchema` without duplicating it
 * — the backend remains the source of truth, and we surface field errors
 * from the `ApiError.body` when it looks like a `validationFailed` response.
 */
export function CreatePersonDialog({
  open,
  onClose,
  onCreated,
}: CreatePersonDialogProps): React.ReactElement {
  const tp = useTranslations('AdminPeople');
  const tc = useTranslations('Common');
  const tLocale = useTranslations('Locale');
  const formId = useId();
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [locale, setLocale] = useState('en');
  const [directoryOptIn, setDirectoryOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const resetState = (): void => {
    setDisplayName('');
    setFullName('');
    setDateOfBirth('');
    setPhone('');
    setEmail('');
    setLocale('en');
    setDirectoryOptIn(false);
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
  };

  const handleClose = (): void => {
    if (submitting) return;
    resetState();
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
    };
    if (fullName.trim()) payload.fullName = fullName.trim();
    if (dateOfBirth.trim()) payload.dateOfBirth = dateOfBirth.trim();
    if (phone.trim()) payload.phoneE164 = phone.trim().replace(/[\s()-]/g, '');
    if (email.trim()) payload.email = email.trim();

    try {
      const created = await apiFetch<Person>('/api/v1/people', {
        method: 'POST',
        json: payload,
      });
      resetState();
      onCreated(created);
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.formError ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : tp('couldNotAddPerson'),
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={tp('createTitle')}
      description={tp('createDesc')}
      size="md"
      footer={
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            {tc('cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={submitting}
            iconLeft={submitting ? undefined : 'check'}
          >
            {submitting ? tp('saving') : tp('savePerson')}
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
          label={tp('displayName')}
          required
          hint={tp('displayNameHint')}
          error={fieldErrors.displayName}
        >
          <Input
            data-autofocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={200}
          />
        </Field>

        <Field
          label={tp('fullName')}
          hint={tp('fullNameHint')}
          error={fieldErrors.fullName}
        >
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={300}
          />
        </Field>

        <Field
          label={tp('dateOfBirth')}
          hint={tp('dateOfBirthHint')}
          error={fieldErrors.dateOfBirth}
        >
          <Input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={tp('phone')}
            hint={tp('phoneHintE164')}
            error={fieldErrors.phoneE164}
          >
            <Input
              type="tel"
              placeholder={tp('phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
            />
          </Field>
          <Field label={tp('email')} error={fieldErrors.email}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={tp('preferredLanguage')} error={fieldErrors.preferredLocale}>
            <Select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
            >
              {LOCALE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {tLocale(value)}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={tp('visibility')}
            hint={tp('visibilityHint')}
          >
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={directoryOptIn}
                onChange={(e) => setDirectoryOptIn(e.target.checked)}
                className="h-4 w-4 rounded-sm border-border text-foreground focus-ring"
              />
              {tp('showInDirectory')}
            </label>
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
