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
  name: string;
  code: string;
  channel: string;
  locale: string;
  body: string;
}

interface CreateTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (row: MessageTemplateRow) => void;
  /** When set, dialog edits this template instead of creating. */
  template?: MessageTemplateRow | null;
  onUpdated?: (row: MessageTemplateRow) => void;
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
 * Create or edit a reusable message template.
 * Staff set a plain name + message; the system assigns the internal code.
 */
export function CreateTemplateDialog({
  open,
  onClose,
  onCreated,
  template = null,
  onUpdated,
}: CreateTemplateDialogProps): React.ReactElement {
  const formId = useId();
  const editing = Boolean(template);
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<string>('sms');
  const [locale, setLocale] = useState<string>('sw');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form when the dialog opens or its subject changes — adjusted
  // during render (React's prop-change pattern) instead of in an effect.
  const [resetFor, setResetFor] = useState({ open: false, template });
  if (resetFor.open !== open || resetFor.template !== template) {
    setResetFor({ open, template });
    if (open) {
      if (template) {
        setName(template.name);
        setChannel(template.channel);
        setLocale(template.locale);
        setBody(template.body);
      } else {
        setName('');
        setChannel('sms');
        setLocale('sw');
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
    if (submitting) return;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      if (editing && template) {
        const updated = await apiFetch<MessageTemplateRow>(
          `/api/v1/message-templates/${template.id}`,
          {
            method: 'PATCH',
            json: {
              name: name.trim(),
              locale,
              body: body.trim(),
            },
          },
        );
        onUpdated?.(updated);
        onClose();
      } else {
        const created = await apiFetch<MessageTemplateRow>(
          '/api/v1/message-templates',
          {
            method: 'POST',
            json: {
              name: name.trim(),
              channel,
              locale,
              body: body.trim(),
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
              ? 'Could not save template.'
              : 'Could not create template.',
        );
      }
      setSubmitting(false);
    }
  };

  const smsHint =
    channel === 'sms'
      ? `${body.length} characters · keep SMS short when you can`
      : null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={editing ? 'Edit template' : 'New template'}
      description={
        editing
          ? 'Update the saved message your team can reuse when texting.'
          : 'Save a message once, then reuse it when you send to the church.'
      }
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
            {submitting
              ? 'Saving…'
              : editing
                ? 'Save changes'
                : 'Create template'}
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
          label="Name"
          required
          hint="A plain label your team will recognise — e.g. Sunday welcome."
          error={fieldErrors.name}
        >
          <Input
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sunday welcome"
            maxLength={120}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Send as"
            required
            error={fieldErrors.channel}
            hint={editing ? 'Channel cannot be changed after create.' : undefined}
          >
            <Select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              disabled={editing}
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Language" error={fieldErrors.locale}>
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              {LOCALES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Message"
          required
          hint={smsHint ?? undefined}
          error={fieldErrors.body}
        >
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
