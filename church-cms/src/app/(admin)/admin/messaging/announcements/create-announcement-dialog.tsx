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
import { t } from '@/app/_ekklesia/i18n/core';

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
  /** When set, dialog opens this announcement for view/edit. */
  announcement?: AnnouncementRow | null;
  onUpdated?: (row: AnnouncementRow) => void;
}

/**
 * Create or edit a church-wide announcement draft.
 */
export function CreateAnnouncementDialog({
  open,
  onClose,
  onCreated,
  announcement = null,
  onUpdated,
}: CreateAnnouncementDialogProps): React.ReactElement {
  const formId = useId();
  const editing = Boolean(announcement);
  const readOnly =
    editing &&
    announcement !== null &&
    announcement.status !== 'draft' &&
    announcement.status !== 'rejected';
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form when the dialog opens or its subject changes — adjusted
  // during render (React's prop-change pattern) instead of in an effect.
  const [resetFor, setResetFor] = useState({ open: false, announcement });
  if (resetFor.open !== open || resetFor.announcement !== announcement) {
    setResetFor({ open, announcement });
    if (open) {
      if (announcement) {
        setTitle(announcement.title);
        setBody(announcement.body);
      } else {
        setTitle('');
        setBody('');
      }
      setFieldErrors({});
      setFormError(null);
      setSubmitting(false);
    }
  }

  const handleClose = (): void => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (submitting || readOnly) return;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (editing && announcement) {
        const updated = await apiFetch<AnnouncementRow>(
          `/api/v1/announcements/${announcement.id}`,
          {
            method: 'PATCH',
            json: {
              title: title.trim(),
              body: body.trim(),
            },
          },
        );
        onUpdated?.(updated);
        onClose();
      } else {
        const created = await apiFetch<AnnouncementRow>(
          '/api/v1/announcements',
          {
            method: 'POST',
            json: {
              title: title.trim(),
              body: body.trim(),
              audiences: [{ audienceType: 'all_members' }],
            },
          },
        );
        onCreated(created);
      }
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
          err instanceof Error
            ? err.message
            : editing
              ? t('Could not save announcement.')
              : t('Could not create announcement.'),
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={
        editing
          ? readOnly
            ? t('Announcement')
            : t('Edit announcement')
          : t('New announcement')
      }
      description={
        editing
          ? readOnly
            ? t('This notice is locked while it awaits approval or after publishing.')
            : t('Update the draft, then submit for approval or publish when ready.')
          : t('Write a notice for your church family. Save as a draft first.')
      }
      size="md"
      footer={
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            {readOnly ? t('Close') : t('Cancel')}
          </Button>
          {readOnly ? null : (
            <Button type="submit" form={formId} loading={submitting}>
              {submitting
                ? t('Saving…')
                : editing
                  ? t('Save changes')
                  : t('Save draft')}
            </Button>
          )}
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

        <Field label={t('Title')} required error={fieldErrors.title}>
          <Input
            data-autofocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('Sunday reminder')}
            maxLength={200}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </Field>

        <Field
          label={t('Message')}
          required
          hint={t('What your church family needs to know.')}
          error={fieldErrors.body}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('Share what your church family needs to know…')}
            rows={6}
            maxLength={5000}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </Field>
      </form>
    </Dialog>
  );
}
