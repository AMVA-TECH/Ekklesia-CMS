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
import type { LeadershipAppointment, Person } from '../../../_lib/api-types';
import { asList } from '../../../_lib/list';
import { extractValidationErrors } from '../../people/form-errors';
import { t } from '@/app/_ekklesia/i18n/core';

interface AppointLeaderDialogProps {
  open: boolean;
  positionId: string;
  positionTitle: string;
  onClose: () => void;
  onCreated: (appointment: LeadershipAppointment) => void;
}

/**
 * Attach a person to a leadership position — `POST /api/v1/appointments`.
 * Does not assign system roles.
 */
export function AppointLeaderDialog({
  open,
  positionId,
  positionTitle,
  onClose,
  onCreated,
}: AppointLeaderDialogProps): React.ReactElement {
  const formId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [personId, setPersonId] = useState('');
  const [appointmentKind, setAppointmentKind] = useState<
    'substantive' | 'acting'
  >('substantive');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [notes, setNotes] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form each time the dialog opens — adjusted during render
  // (React's prop-change pattern) instead of in an effect.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery('');
      setResults([]);
      setPersonId('');
      setAppointmentKind('substantive');
      setEffectiveFrom(new Date().toISOString().slice(0, 10));
      setNotes('');
      setFieldErrors({});
      setFormError(null);
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    // Short queries clear results in the input's onChange handler.
    if (q.length < 2) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const payload = await apiFetch<Person[] | { data: Person[] }>(
            `/api/v1/people?q=${encodeURIComponent(q)}&limit=10`,
          );
          setResults(asList(payload));
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, open]);

  const handleClose = (): void => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    if (!personId) {
      setFieldErrors({ personId: t('Pick a person from the search results.') });
      return;
    }
    if (!effectiveFrom.trim()) {
      setFieldErrors({ effectiveFrom: t('Start date is required.') });
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      const created = await apiFetch<LeadershipAppointment>(
        '/api/v1/appointments',
        {
          method: 'POST',
          json: {
            positionId,
            personId,
            appointmentKind,
            effectiveFrom: effectiveFrom.trim(),
            notes: notes.trim() || undefined,
          },
        },
      );
      onCreated(created);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.formError ?? err.message);
      } else {
        setFormError(
          err instanceof Error
            ? err.message
            : t('Could not appoint this person.'),
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
      title={t('Appoint leader')}
      description={t('Attach a person to {0}. This does not grant system login permissions — assign roles separately under Church profile.', positionTitle)}
      size="md"
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
            {submitting ? t('Saving…') : t('Appoint')}
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
          label={t('Person')}
          required
          hint={searching ? t('Searching…') : t('Type at least 2 letters')}
          error={fieldErrors.personId}
        >
          <Input
            data-autofocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length < 2) setResults([]);
              setPersonId('');
            }}
            placeholder={t('Search by name…')}
          />
        </Field>

        {results.length > 0 ? (
          <ul className="max-h-40 overflow-y-auto rounded-md border border-border">
            {results.map((p) => {
              const active = p.id === personId;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPersonId(p.id);
                      setQuery(p.displayName);
                    }}
                    className={`flex w-full px-3 py-2 text-left text-sm focus-ring ${
                      active
                        ? 'bg-[color:var(--brand-gold-tint)]'
                        : 'hover:bg-surface-muted'
                    }`}
                  >
                    <span className="font-medium">{p.displayName}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <Field label={t('Appointment kind')} error={fieldErrors.appointmentKind}>
          <Select
            value={appointmentKind}
            onChange={(e) =>
              setAppointmentKind(e.target.value as 'substantive' | 'acting')
            }
          >
            <option value="substantive">{t('Substantive')}</option>
            <option value="acting">{t('Acting / temporary')}</option>
          </Select>
        </Field>

        <Field
          label={t('Effective from')}
          required
          error={fieldErrors.effectiveFrom}
        >
          <Input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            required
          />
        </Field>

        <Field label={t('Notes')} error={fieldErrors.notes}>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            placeholder={t('Optional')}
          />
        </Field>
      </form>
    </Dialog>
  );
}
