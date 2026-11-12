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
import type { OrganisationalUnit } from '../../_lib/api-types';

interface CreateUnitDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (unit: OrganisationalUnit) => void;
  parents: readonly OrganisationalUnit[];
}

const KINDS: Array<{ value: 'ministry' | 'department' | 'life_group'; label: string }> = [
  { value: 'ministry', label: 'Ministry' },
  { value: 'department', label: 'Department' },
  { value: 'life_group', label: 'Life group' },
];

export function CreateUnitDialog({
  open,
  onClose,
  onCreated,
  parents,
}: CreateUnitDialogProps): React.ReactElement {
  const formId = useId();
  const [kind, setKind] = useState<'ministry' | 'department' | 'life_group'>('ministry');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const reset = (): void => {
    setKind('ministry');
    setName('');
    setParentId('');
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
  };

  const handleClose = (): void => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    const payload: Record<string, unknown> = {
      kind,
      name: name.trim(),
    };
    if (parentId) payload.parentId = parentId;
    try {
      const created = await apiFetch<OrganisationalUnit>(
        '/api/v1/organisational-units',
        {
          method: 'POST',
          json: payload,
        },
      );
      reset();
      onCreated(created);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as
          | {
              details?: Array<{ field: string; message: string }>;
              error?: string;
            }
          | null;
        if (body?.details?.length) {
          const next: Record<string, string> = {};
          for (const d of body.details) {
            if (d.field && d.message) next[d.field] = d.message;
          }
          setFieldErrors(next);
        }
        setFormError(body?.error ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Could not create this unit.',
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New unit"
      description="Create a ministry, department, or life group."
      size="sm"
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {submitting ? 'Saving…' : 'Create unit'}
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

        <Field label="Kind" required error={fieldErrors.kind}>
          <Select
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as 'ministry' | 'department' | 'life_group')
            }
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Name"
          required
          hint="e.g. 'Worship ministry' or 'Youth department'."
          error={fieldErrors.name}
        >
          <Input
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
          />
        </Field>

        {parents.length > 0 ? (
          <Field
            label="Parent unit"
            hint="Optional — nest this under another unit."
            error={fieldErrors.parentId}
          >
            <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">No parent</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </form>
    </Dialog>
  );
}
