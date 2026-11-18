'use client';

import { useId, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
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

const CHANNEL_VALUES = ['sms', 'whatsapp', 'email', 'in_app'] as const;
const LOCALE_VALUES = ['en', 'sw'] as const;

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
  const tm = useTranslations('AdminMessaging');
  const tc = useTranslations('Common');
  const tLocale = useTranslations('Locale');
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

  const channelLabel = (value: string): string => {
    switch (value) {
      case 'sms':
        return tm('channelSms');
      case 'whatsapp':
        return tm('channelWhatsapp');
      case 'email':
        return tm('channelEmail');
      case 'in_app':
        return tm('channelInApp');
      default:
        return value;
    }
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
              ? tm('couldNotSaveTemplate')
              : tm('couldNotCreateTemplate'),
        );
      }
      setSubmitting(false);
    }
  };

  const smsHint =
    channel === 'sms'
      ? tm('smsCharHint', { count: body.length })
      : null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={editing ? tm('editTemplate') : tm('newTemplateTitle')}
      description={
        editing
          ? tm('editTemplateDesc')
          : tm('newTemplateDesc')
      }
      size="md"
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
            {submitting
              ? tm('saving')
              : editing
                ? tm('saveChanges')
                : tm('createTemplate')}
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
          label={tm('name')}
          required
          hint={tm('nameHint')}
          error={fieldErrors.name}
        >
          <Input
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tm('namePlaceholder')}
            maxLength={120}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={tm('sendAs')}
            required
            error={fieldErrors.channel}
            hint={editing ? tm('channelLockedHint') : undefined}
          >
            <Select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              disabled={editing}
            >
              {CHANNEL_VALUES.map((value) => (
                <option key={value} value={value}>
                  {channelLabel(value)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={tm('language')} error={fieldErrors.locale}>
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              {LOCALE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {tLocale(value)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label={tm('message')}
          required
          hint={smsHint ?? undefined}
          error={fieldErrors.body}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={tm('templateMessagePlaceholder')}
            rows={5}
            maxLength={2000}
          />
        </Field>
      </form>
    </Dialog>
  );
}
