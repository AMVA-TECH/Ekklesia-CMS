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
  const tf = useTranslations('AdminFinance');
  const tc = useTranslations('Common');
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

  // Reset the form each time the dialog opens — adjusted during render
  // (React's prop-change pattern) instead of in an effect.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery('');
      setResults([]);
      setPersonId('');
      setAmount('');
      setFundId('');
      setDueOn('');
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
      setFieldErrors({ personId: tf('pickPerson') });
      return;
    }
    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setFieldErrors({ amountMinor: tf('amountGreaterThanZero') });
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
          err instanceof Error ? err.message : tf('couldNotCreatePledge'),
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
      title={tf('newPledgeTitle')}
      description={tf('newPledgeDesc')}
      size="sm"
      footer={
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            {tc('cancel')}
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {submitting ? tf('saving') : tf('createPledge')}
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
          label={tf('person')}
          required
          hint={searching ? tc('searching') : tf('typeAtLeast2')}
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
            placeholder={tf('nameEllipsis')}
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
            {tf('selected', { name: selected.displayName })}
          </p>
        ) : null}

        <Field
          label={tf('amount')}
          required
          hint={tf('amountHint')}
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

        <Field label={tf('fund')} hint={tc('optional')} error={fieldErrors.fundId}>
          <Select value={fundId} onChange={(e) => setFundId(e.target.value)}>
            <option value="">{tf('unassigned')}</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.code})
              </option>
            ))}
          </Select>
        </Field>

        <Field label={tf('dueDate')} hint={tc('optional')} error={fieldErrors.dueOn}>
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
