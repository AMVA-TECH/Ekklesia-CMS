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
  Textarea,
} from '@/app/_ekklesia/ui';
import { extractValidationErrors } from '../../people/form-errors';

export interface MessageJobRow {
  id: string;
  channel: string;
  title: string | null;
  body: string | null;
  audienceType: string | null;
  organisationalUnitId: string | null;
  templateId: string | null;
  announcementId: string | null;
  status: string;
  scheduledFor: string | null;
  recipientCount: number;
  skippedNoContact: number;
  skippedOptOut: number;
  createdBy: string | null;
  createdAt: string;
}

interface CreateJobDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (row: MessageJobRow) => void;
}

const CHANNELS = [
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
] as const;

const AUDIENCES = [
  { value: 'all_members', label: 'All members' },
] as const;

/**
 * Queue a leadership text blast (create message job).
 */
export function CreateJobDialog({
  open,
  onClose,
  onCreated,
}: CreateJobDialogProps): React.ReactElement {
  const formId = useId();
  const [channel, setChannel] = useState<string>('sms');
  const [audienceType, setAudienceType] = useState<string>('all_members');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const reset = (): void => {
    setChannel('sms');
    setAudienceType('all_members');
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
      const payload: Record<string, unknown> = {
        channel,
        audienceType,
        body: body.trim(),
      };
      if (title.trim()) payload.title = title.trim();

      const created = await apiFetch<MessageJobRow>('/api/v1/message-jobs', {
        method: 'POST',
        json: payload,
      });
      reset();
      onCreated(created);
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.formError ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Could not create message job.',
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New send job"
      description="Queue an SMS or WhatsApp blast for members who have opted in."
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
            {submitting ? 'Queuing…' : 'Queue job'}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Channel" required error={fieldErrors.channel}>
            <Select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Audience" required error={fieldErrors.audienceType}>
            <Select
              value={audienceType}
              onChange={(e) => setAudienceType(e.target.value)}
            >
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Title" hint="Optional label for this job." error={fieldErrors.title}>
          <Input
            data-autofocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sunday reminder"
            maxLength={200}
          />
        </Field>

        <Field label="Body" required error={fieldErrors.body}>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Karibu — service starts at 10:00…"
            rows={5}
            maxLength={2000}
          />
        </Field>
      </form>
    </Dialog>
  );
}
