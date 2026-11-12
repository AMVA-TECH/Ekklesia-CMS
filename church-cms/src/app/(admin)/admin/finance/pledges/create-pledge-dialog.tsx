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
import type { Fund, Person, Pledge } from '../../../_lib/api-types';
import { asList } from '../../../_lib/list';
import { extractValidationErrors } from '../../people/form-errors';

interface CreatePledgeDialogProps {
  open: boolean;
  funds: readonly Fund[];
  onClose: () => void;
  onCreated: (pledge: Pledge) => void;
}

/**
 * Create a pledge — `POST /api/v1/pledges`.
 * Backend requires personId or householdId; this form collects a person.
 */
export function CreatePledgeDialog({
  open,
  funds,
  onClose,
  onCreated,
}: CreatePledgeDialogProps): React.ReactElement {
  const formId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [personId, setPersonId] = useState('');
  const [amount, setAmount] = useState('');
  const [fundId, setFundId] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setPersonId('');
    setAmount('');
    setFundId('');
    setDueOn('');
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
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setFieldErrors({ amountMinor: 'Enter an amount greater than zero.' });
      return;
    }
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    const payload: Record<string, unknown> = {
      personId,
      amountMinor: Math.round(amountNumber * 100),
    };
    if (fundId) payload.fundId = fundId;
    if (dueOn.trim()) payload.dueOn = dueOn.trim();

    try {
      const created = await apiFetch<Pledge>('/api/v1/pledges', {
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
          err instanceof Error ? err.message : 'Could not create pledge.',
        );
      }
      setSubmitting(false);
    }
  };

  const selected = results.find((p) => p.id === personId);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New pledge"
      description="Record a promise of giving. Amount is entered in the major unit (e.g. TZS 10,000)."
      size="sm"
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
            {submitting ? 'Saving…' : 'Create pledge'}
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
            Selected: {selected.displayName}
          </p>
        ) : null}

        <Field
          label="Amount"
          required
          hint="Entered in the main currency unit (e.g. TZS)."
          error={fieldErrors.amountMinor}
        >
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>

        <Field label="Fund" hint="Optional" error={fieldErrors.fundId}>
          <Select value={fundId} onChange={(e) => setFundId(e.target.value)}>
            <option value="">Unassigned</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.code})
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Due date" hint="Optional" error={fieldErrors.dueOn}>
          <Input
            type="date"
            value={dueOn}
            onChange={(e) => setDueOn(e.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  );
}
