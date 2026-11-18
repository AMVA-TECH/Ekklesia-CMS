'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
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
import type { Membership, Person } from '../../_lib/api-types';
import { asList } from '../../_lib/list';
import { extractValidationErrors } from '../people/form-errors';

interface CreateMembershipDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (membership: Membership) => void;
}

const TYPES = ['individual', 'household', 'family'] as const;
const STATUSES = ['visitor', 'active', 'inactive'] as const;

/** Create membership — `POST /api/v1/memberships`. */
export function CreateMembershipDialog({
  open,
  onClose,
  onCreated,
}: CreateMembershipDialogProps): React.ReactElement {
  const tm = useTranslations('AdminMemberships');
  const tc = useTranslations('Common');
  const formId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [personId, setPersonId] = useState('');
  const [membershipType, setMembershipType] =
    useState<(typeof TYPES)[number]>('individual');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('visitor');
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
      setMembershipType('individual');
      setStatus('visitor');
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

  const typeLabel = (value: (typeof TYPES)[number]): string => {
    switch (value) {
      case 'individual':
        return tm('typeIndividual');
      case 'household':
        return tm('typeHousehold');
      case 'family':
        return tm('typeFamily');
      default:
        return value;
    }
  };

  const statusLabel = (value: (typeof STATUSES)[number]): string => {
    switch (value) {
      case 'visitor':
        return tm('statusVisitor');
      case 'active':
        return tm('statusActive');
      case 'inactive':
        return tm('statusInactive');
      default:
        return value;
    }
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    if (!personId) {
      setFieldErrors({ personId: tm('pickPerson') });
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      personId,
      membershipType,
      status,
    };
    if (effectiveFrom.trim()) payload.effectiveFrom = effectiveFrom.trim();

    try {
      const created = await apiFetch<Membership>('/api/v1/memberships', {
        method: 'POST',
        json: payload,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.formError ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : tm('couldNotCreate'),
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
      title={tm('createTitle')}
      description={tm('createDesc')}
      size="md"
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            {tc('cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={submitting}
            iconLeft={submitting ? undefined : 'plus'}
          >
            {submitting ? tm('saving') : tm('createMembership')}
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
          label={tm('person')}
          required
          hint={searching ? tm('searching') : tm('typeAtLeast2')}
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
            placeholder={tm('searchByName')}
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

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={tm('type')} error={fieldErrors.membershipType}>
            <Select
              value={membershipType}
              onChange={(e) =>
                setMembershipType(e.target.value as (typeof TYPES)[number])
              }
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {typeLabel(type)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={tm('startingStatus')} error={fieldErrors.status}>
            <Select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof STATUSES)[number])
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label={tm('effectiveFrom')}
          hint={tm('effectiveFromHint')}
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
