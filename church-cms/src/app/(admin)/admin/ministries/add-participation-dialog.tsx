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
import type { Participation, Person } from '../../_lib/api-types';
import { asList } from '../../_lib/list';
import { extractValidationErrors } from '../people/form-errors';
import { t } from '@/app/_ekklesia/i18n/core';

interface AddParticipationDialogProps {
  open: boolean;
  unitId: string;
  unitName: string;
  onClose: () => void;
  onCreated: (participation: Participation) => void;
}

/**
 * Add a person to a unit — `POST /api/v1/organisational-units/:id/participations`.
 */
export function AddParticipationDialog({
  open,
  unitId,
  unitName,
  onClose,
  onCreated,
}: AddParticipationDialogProps): React.ReactElement {
  const formId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [personId, setPersonId] = useState('');
  const [roleInUnit, setRoleInUnit] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
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
      setRoleInUnit('');
      setEffectiveFrom('');
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
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);
    const payload: Record<string, unknown> = { personId };
    if (roleInUnit.trim()) payload.roleInUnit = roleInUnit.trim();
    if (effectiveFrom.trim()) payload.effectiveFrom = effectiveFrom.trim();

    try {
      const created = await apiFetch<Participation>(
        `/api/v1/organisational-units/${unitId}/participations`,
        {
          method: 'POST',
          json: payload,
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
            : t('Could not add this participation.'),
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
      title={t('Add participation')}
      description={t('Add someone to {0}.', unitName)}
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
            iconLeft={submitting ? undefined : 'plus'}
          >
            {submitting ? t('Saving…') : t('Add participation')}
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

        <Field
          label={t('Role in unit')}
          hint={t('Optional — e.g. Leader, Member')}
          error={fieldErrors.roleInUnit}
        >
          <Input
            value={roleInUnit}
            onChange={(e) => setRoleInUnit(e.target.value)}
            maxLength={100}
          />
        </Field>

        <Field
          label={t('Effective from')}
          hint={t('Optional — YYYY-MM-DD (defaults to today)')}
          error={fieldErrors.effectiveFrom}
        >
          <Input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  );
}
