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
import type { Household, Person } from '../../../_lib/api-types';
import { asList } from '../../../_lib/list';
import { extractValidationErrors } from '../../people/form-errors';

interface AddMemberDialogProps {
  open: boolean;
  householdId: string;
  onClose: () => void;
  onSaved: (household: Household) => void;
}

const RELATIONSHIPS = [
  'member',
  'spouse',
  'parent',
  'guardian',
  'other',
] as const;

/**
 * Link an existing person — `POST /api/v1/households/:id/members`.
 */
export function AddMemberDialog({
  open,
  householdId,
  onClose,
  onSaved,
}: AddMemberDialogProps): React.ReactElement {
  const formId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [personId, setPersonId] = useState('');
  const [relationship, setRelationship] =
    useState<(typeof RELATIONSHIPS)[number]>('member');
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setPersonId('');
    setRelationship('member');
    setIsPrimaryContact(false);
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
    try {
      const updated = await apiFetch<Household>(
        `/api/v1/households/${householdId}/members`,
        {
          method: 'POST',
          json: { personId, relationship, isPrimaryContact },
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
          err instanceof Error ? err.message : 'Could not add this member.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selected = results.find((p) => p.id === personId);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add household member"
      description="Search the people directory and link someone to this household."
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
            {submitting ? 'Saving…' : 'Add member'}
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
          label="Search people"
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
            placeholder="Name…"
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
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm focus-ring ${
                      active
                        ? 'bg-[color:var(--brand-gold-tint)] text-foreground'
                        : 'hover:bg-surface-muted'
                    }`}
                  >
                    <span className="font-medium">{p.displayName}</span>
                    {p.fullName ? (
                      <span className="text-xs text-muted-foreground">
                        {p.fullName}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {selected ? (
          <p className="text-xs text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{selected.displayName}</span>
          </p>
        ) : null}

        <Field label="Relationship" error={fieldErrors.relationship}>
          <Select
            value={relationship}
            onChange={(e) =>
              setRelationship(e.target.value as (typeof RELATIONSHIPS)[number])
            }
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </Select>
        </Field>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={isPrimaryContact}
            onChange={(e) => setIsPrimaryContact(e.target.checked)}
            className="h-4 w-4 rounded-sm border-border text-foreground focus-ring"
          />
          Primary household contact
        </label>
      </form>
    </Dialog>
  );
}
