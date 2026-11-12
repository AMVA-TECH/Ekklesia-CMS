'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
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
import { Icon } from '@/app/_ekklesia/icons';
import type { EventRow, EventType } from '../../_lib/api-types';

interface CreateEventDialogProps {
  open: boolean;
  types: readonly EventType[];
  onClose: () => void;
  onCreated: (event: EventRow) => void;
}

/**
 * Create an event + optionally upload a poster in the same pass.
 *
 * Two-step flow when a poster is attached:
 *   1. POST /api/v1/media/uploads  → `{ id }`
 *   2. POST /api/v1/events         → includes `posterMediaId`
 *
 * This preserves the exact workflow from the legacy /events page, but uses
 * `apiFetch` so dev-auth headers live in one place.
 */
export function CreateEventDialog({
  open,
  types,
  onClose,
  onCreated,
}: CreateEventDialogProps): React.ReactElement {
  const formId = useId();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceDate, setServiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [eventTypeCode, setEventTypeCode] = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Preselect sunday_service when present, otherwise first available type.
  useEffect(() => {
    if (!open || eventTypeCode) return;
    const preferred =
      types.find((t) => t.code === 'sunday_service') ?? types[0];
    if (preferred) setEventTypeCode(preferred.code);
  }, [open, eventTypeCode, types]);

  useEffect(() => {
    if (!posterFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(posterFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [posterFile]);

  const reset = (): void => {
    setTitle('');
    setDescription('');
    setServiceDate(new Date().toISOString().slice(0, 10));
    setEventTypeCode('');
    setPosterFile(null);
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
      let posterMediaId: string | undefined;
      if (posterFile) {
        const form = new FormData();
        form.append('file', posterFile);
        form.append('kind', 'event_poster');
        const uploaded = await apiFetch<{ id: string }>(
          '/api/v1/media/uploads',
          {
            method: 'POST',
            body: form,
          },
        );
        posterMediaId = uploaded.id;
      }
      const payload: Record<string, unknown> = {
        title: title.trim(),
        serviceDate,
        eventTypeCode,
      };
      if (description.trim()) payload.description = description.trim();
      if (posterMediaId) payload.posterMediaId = posterMediaId;

      const created = await apiFetch<EventRow>('/api/v1/events', {
        method: 'POST',
        json: payload,
      });
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
          err instanceof Error ? err.message : 'Could not create event.',
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New event"
      description="Schedule a service or gathering. Attach a poster if you'd like members to see it on their home screen."
      size="lg"
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {submitting ? 'Saving…' : 'Save event'}
          </Button>
        </DialogFooter>
      }
    >
      <form
        id={formId}
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="grid gap-4 md:grid-cols-[1fr_260px]"
      >
        <div className="flex flex-col gap-4">
          {formError ? (
            <div
              role="alert"
              className="rounded-md border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--danger-ink)]"
            >
              {formError}
            </div>
          ) : null}

          {types.length === 0 ? (
            <div
              role="alert"
              className="rounded-md border border-[color:var(--warning-soft)] bg-[color:var(--warning-soft)] px-3 py-2 text-sm text-[color:var(--warning-ink)]"
            >
              No event types are configured yet. Ask an administrator to add
              one (e.g. &ldquo;Sunday service&rdquo;) before scheduling.
            </div>
          ) : (
            <Field label="Type" required error={fieldErrors.eventTypeCode}>
              <Select
                value={eventTypeCode}
                onChange={(e) => setEventTypeCode(e.target.value)}
                required
              >
                {types.map((t) => (
                  <option key={t.id} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Title" required error={fieldErrors.title}>
            <Input
              data-autofocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                eventTypeCode === 'sunday_service'
                  ? 'Sunday service · 1st service'
                  : 'Event title'
              }
              maxLength={300}
            />
          </Field>

          <Field label="Service date" required error={fieldErrors.serviceDate}>
            <Input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              required
            />
          </Field>

          <Field
            label="Description"
            hint="Optional note for the calendar."
            error={fieldErrors.description}
          >
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              placeholder="Theme, invited speaker, meeting point…"
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3">
          <Field
            label="Poster image"
            hint="JPEG, PNG, WebP, or GIF."
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-sm file:text-foreground hover:file:bg-border focus-ring"
            />
          </Field>
          <div className="aspect-[3/4] w-full overflow-hidden rounded-md border border-dashed border-border bg-surface-muted">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Poster preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                <span className="inline-flex flex-col items-center gap-2">
                  <Icon name="image" size={24} />
                  Preview appears here
                </span>
              </div>
            )}
          </div>
          {posterFile ? (
            <Button
              variant="ghost"
              size="sm"
              iconLeft="trash"
              onClick={() => setPosterFile(null)}
            >
              Remove poster
            </Button>
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}
