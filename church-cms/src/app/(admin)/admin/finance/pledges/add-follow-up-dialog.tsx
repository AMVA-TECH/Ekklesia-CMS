'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Button,
  Dialog,
  DialogFooter,
  Field,
  Textarea,
} from '@/app/_ekklesia/ui';
import { extractValidationErrors } from '../../people/form-errors';

interface AddFollowUpDialogProps {
  open: boolean;
  pledgeId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Log a pledge follow-up — `POST /api/v1/pledges/:id/follow-ups`.
 */
export function AddFollowUpDialog({
  open,
  pledgeId,
  onClose,
  onSaved,
}: AddFollowUpDialogProps): React.ReactElement {
  const formId = useId();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNote('');
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, pledgeId]);

  const handleClose = (): void => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (submitting || !pledgeId) return;
    const trimmed = note.trim();
    if (!trimmed) {
      setFieldErrors({ note: 'Enter a follow-up note.' });
      return;
    }
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await apiFetch(`/api/v1/pledges/${pledgeId}/follow-ups`, {
        method: 'POST',
        json: { note: trimmed },
      });
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.formError ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Could not save follow-up.',
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Log follow-up"
      description="Note a kind check-in about this pledge. This is recorded against the pledge for pastoral care."
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
            {submitting ? 'Saving…' : 'Save follow-up'}
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

        <Field label="Note" required error={fieldErrors.note}>
          <Textarea
            data-autofocus
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            placeholder="Called to check in…"
            required
          />
        </Field>
      </form>
    </Dialog>
  );
}
