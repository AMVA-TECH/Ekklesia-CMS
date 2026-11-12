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

export interface MessageTemplateRow {
  id: string;
  code: string;
  channel: string;
  locale: string;
  body: string;
}

interface CreateTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (row: MessageTemplateRow) => void;
}

const CHANNELS = [
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'in_app', label: 'In-app' },
] as const;

const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Kiswahili' },
] as const;

/**
 * Create a reusable message template (code + channel + locale + body).
 */
export function CreateTemplateDialog({
  open,
  onClose,
  onCreated,
}: CreateTemplateDialogProps): React.ReactElement {
  const formId = useId();
  const [code, setCode] = useState('');
  const [channel, setChannel] = useState<string>('sms');
  const [locale, setLocale] = useState<string>('en');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const reset = (): void => {
    setCode('');
    setChannel('sms');
    setLocale('en');
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
      const created = await apiFetch<MessageTemplateRow>(
        '/api/v1/message-templates',
        {
          method: 'POST',
          json: {
            code: code.trim().toLowerCase(),
            channel,
            locale,
            body: body.trim(),
          },
        },
      );
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
          err instanceof Error ? err.message : 'Could not create template.',
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New template"
      description="Reusable copy for SMS, WhatsApp, email, or in-app notices."
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
            {submitting ? 'Saving…' : 'Create template'}
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
          label="Code"
          required
          hint="Lowercase letters, digits, underscore — e.g. sunday_reminder."
          error={fieldErrors.code}
        >
          <Input
            data-autofocus
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
            }
            placeholder="sunday_reminder"
            maxLength={50}
          />
        </Field>

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

          <Field label="Locale" error={fieldErrors.locale}>
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              {LOCALES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

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
