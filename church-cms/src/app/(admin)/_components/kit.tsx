'use client';

/**
 * Small admin building blocks shared by list/detail screens so each page
 * only describes its own columns and forms.
 */

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { apiFetch } from '@/app/_ekklesia/session';
import type { IconName } from '@/app/_ekklesia/icons';
import {
  Button,
  Dialog,
  DialogFooter,
  EmptyState,
  Field,
  Input,
  Skeleton,
  useToast,
} from '@/app/_ekklesia/ui';
import type { Person } from '../_lib/api-types';
import { errorMessage, fieldErrorsFrom } from '../_lib/errors';
import { asList } from '../_lib/list';

/* ------------------------------------------------------------------ */
/* List states                                                         */
/* ------------------------------------------------------------------ */

export interface ListStateProps {
  loading: boolean;
  error: string | null;
  forbidden?: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  empty: { icon?: IconName; title: string; description?: string; action?: ReactNode };
  children: ReactNode;
}

/** Error / forbidden / loading / empty / content switch for a list panel. */
export function ListState({
  loading,
  error,
  forbidden,
  isEmpty,
  onRetry,
  empty,
  children,
}: ListStateProps): React.ReactElement {
  if (forbidden) {
    return (
      <EmptyState
        icon="lock"
        tone="neutral"
        title="You don't have access to this"
        description="Ask a church administrator to grant the permission if you need it."
      />
    );
  }
  if (error) {
    return (
      <div className="px-5 py-8 text-center text-sm text-[color:var(--danger-ink)]">
        {error}
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (loading && isEmpty) {
    return (
      <div className="space-y-3 px-5 py-6">
        <Skeleton size="block" />
        <Skeleton size="block" />
      </div>
    );
  }
  if (isEmpty) {
    return (
      <EmptyState
        icon={empty.icon ?? 'inbox'}
        tone="gold"
        title={empty.title}
        description={empty.description}
        action={empty.action}
      />
    );
  }
  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/* Form dialog                                                         */
/* ------------------------------------------------------------------ */

export interface FormDialogProps {
  title: string;
  description?: ReactNode;
  submitLabel: string;
  size?: 'sm' | 'md' | 'lg';
  onClose: () => void;
  /** Throw to show the error; API 422 field details map onto `fieldErrors`. */
  onSubmit: () => Promise<void>;
  /** Client-side validation; return field errors to block submit. */
  validate?: () => Record<string, string>;
  submitVariant?: 'primary' | 'destructive';
  children: (fieldErrors: Record<string, string>) => ReactNode;
}

/**
 * Dialog with a single form, submit/cancel footer, server field errors and a
 * form-level alert. Mount it only while open (`{open ? <X/> : null}`) so its
 * fields start fresh each time.
 */
export function FormDialog({
  title,
  description,
  submitLabel,
  size = 'md',
  onClose,
  onSubmit,
  validate,
  submitVariant = 'primary',
  children,
}: FormDialogProps): React.ReactElement {
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const close = (): void => {
    if (!submitting) onClose();
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    const clientErrors = validate?.() ?? {};
    setFieldErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length > 0) return;
    setSubmitting(true);
    try {
      await onSubmit();
    } catch (err) {
      setFieldErrors(fieldErrorsFrom(err));
      setFormError(errorMessage(err, 'Something went wrong. Please try again.'));
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={close}
      title={title}
      description={description}
      size={size}
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={submitting}
            variant={submitVariant}
          >
            {submitLabel}
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
        {children(fieldErrors)}
      </form>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Row actions                                                         */
/* ------------------------------------------------------------------ */

/**
 * Run a one-click mutation (approve, post, close…) with a toast and a busy
 * key so only the clicked row shows a spinner.
 */
export function useRowAction(): {
  busyKey: string | null;
  run: (
    key: string,
    action: () => Promise<unknown>,
    messages: { success: string; detail?: string; failure: string },
  ) => Promise<boolean>;
} {
  const { push } = useToast();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const run = async (
    key: string,
    action: () => Promise<unknown>,
    messages: { success: string; detail?: string; failure: string },
  ): Promise<boolean> => {
    setBusyKey(key);
    try {
      await action();
      push({
        tone: 'success',
        title: messages.success,
        message: messages.detail ?? 'Saved.',
      });
      return true;
    } catch (err) {
      push({
        tone: 'danger',
        title: messages.failure,
        message: errorMessage(err, 'Please try again.'),
      });
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  return { busyKey, run };
}

/* ------------------------------------------------------------------ */
/* Person picker                                                       */
/* ------------------------------------------------------------------ */

export interface PersonPickerProps {
  label?: string;
  required?: boolean;
  error?: string;
  value: Person | null;
  onChange: (person: Person | null) => void;
}

/** Debounce-free search box: type ≥2 chars, press Search or Enter, pick one. */
export function PersonPicker({
  label = 'Person',
  required,
  error,
  value,
  onChange,
}: PersonPickerProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async (): Promise<void> => {
    const q = query.trim();
    if (q.length < 2) return;
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
      setSearched(true);
    }
  };

  if (value) {
    return (
      <Field label={label} required={required} error={error}>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <span className="font-medium text-foreground">{value.displayName}</span>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Change
          </Button>
        </div>
      </Field>
    );
  }

  return (
    <Field
      label={label}
      required={required}
      error={error}
      hint="Type at least two letters of their name."
    >
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearched(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void search();
              }
            }}
            placeholder="Search by name…"
          />
          <Button
            variant="secondary"
            onClick={() => void search()}
            loading={searching}
            disabled={query.trim().length < 2}
          >
            Search
          </Button>
        </div>
        {results.length > 0 ? (
          <ul className="max-h-48 overflow-auto rounded-md border border-border">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface-muted focus-ring"
                  onClick={() => onChange(p)}
                >
                  {p.displayName}
                  {p.fullName && p.fullName !== p.displayName ? (
                    <span className="ml-2 text-muted-foreground">{p.fullName}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : searched && !searching ? (
          <p className="text-sm text-muted-foreground">No people match that search.</p>
        ) : null}
      </div>
    </Field>
  );
}

/** Red inline alert for a page-level error banner. */
export function InlineAlert({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div
      role="alert"
      className="rounded-md border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--danger-ink)]"
    >
      {children}
    </div>
  );
}
