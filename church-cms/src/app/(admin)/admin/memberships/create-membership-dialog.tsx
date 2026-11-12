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

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setPersonId('');
    setMembershipType('individual');
    setStatus('visitor');
    setEffectiveFrom('');
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
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
      setFieldErrors({ personId: 'Pick a person from the search results.' });
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
          err instanceof Error ? err.message : 'Could not create membership.',
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
      title="Add membership"
      description="Start a membership journey for someone already in your people directory."
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
            iconLeft={submitting ? undefined : 'plus'}
          >
            {submitting ? 'Saving…' : 'Create membership'}
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
          label="Person"
          required
          hint={searching ? 'Searching…' : 'Type at least 2 letters'}
          error={fieldErrors.personId}
        >
          <Input
            data-autofocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPersonId('');
            }}
            placeholder="Search by name…"
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
          <Field label="Type" error={fieldErrors.membershipType}>
            <Select
              value={membershipType}
              onChange={(e) =>
                setMembershipType(e.target.value as (typeof TYPES)[number])
              }
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Starting status" error={fieldErrors.status}>
            <Select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof STATUSES)[number])
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Effective from"
          hint="Optional — YYYY-MM-DD (defaults to today)"
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
