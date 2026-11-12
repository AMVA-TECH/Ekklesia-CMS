'use client';

import { useId, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Button,
  Dialog,
  DialogFooter,
  Field,
  Input,
  Textarea,
} from '@/app/_ekklesia/ui';

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  status: string;
  publishedAt: string | null;
}

interface CreateAnnouncementDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (row: AnnouncementRow) => void;
}

/**
 * Create a church-wide announcement draft (default audience: all members).
 */
export function CreateAnnouncementDialog({
  open,
  onClose,
  onCreated,
}: CreateAnnouncementDialogProps): React.ReactElement {
  const formId = useId();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const reset = (): void => {
    setTitle('');
    setBody('');
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
    try {
      const created = await apiFetch<AnnouncementRow>('/api/v1/announcements', {
        method: 'POST',
        json: {
          title: title.trim(),
          body: body.trim(),
          audiences: [{ audienceType: 'all_members' }],
        },
      });
      reset();
      onCreated(created);
    } catch (err) {
      if (err instanceof ApiError) {
        const problem = err.body as
          | {
              detail?: string;
              errors?: Array<{ field: string; message?: string }>;
            }
          | null;
        if (problem?.errors?.length) {
          const next: Record<string, string> = {};
          for (const d of problem.errors) {
            if (d.field && d.message) next[d.field] = d.message;
          }
          setFieldErrors(next);
        }
        setFormError(problem?.detail ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Could not create announcement.',
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New announcement"
      description="Draft a notice for the whole congregation. Submit for approval or publish when ready."
      size="md"
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
            {submitting ? 'Saving…' : 'Save draft'}
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

        <Field label="Title" required error={fieldErrors.title}>
          <Input
            data-autofocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sunday reminder"
            maxLength={200}
          />
        </Field>

        <Field
          label="Body"
          required
          hint="Plain text shown in the member feed and any linked blast."
          error={fieldErrors.body}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share what your church family needs to know…"
            rows={6}
            maxLength={5000}
          />
        </Field>
      </form>
    </Dialog>
  );
}
