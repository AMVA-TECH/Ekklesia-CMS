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
import { extractValidationErrors } from '../people/form-errors';
import { titleCase } from '../../_lib/format';

/** Matches `EVENT_STATUSES` / `updateEventBodySchema.status`. */
const EVENT_STATUSES = ['scheduled', 'cancelled', 'completed'] as const;

interface EditEventDialogProps {
  open: boolean;
  event: EventRow;
  types: readonly EventType[];
  onClose: () => void;
  onSaved: (event: EventRow) => void;
}

/**
 * Admin event edit — maps to `PATCH /api/v1/events/:id`
 * (`updateEventBodySchema`: title, description, serviceDate, eventTypeId,
 * startsAt, endsAt, status, posterMediaId — not eventTypeCode).
 */
export function EditEventDialog({
  open,
  event,
  types,
  onClose,
  onSaved,
}: EditEventDialogProps): React.ReactElement {
  const formId = useId();
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? '');
  const [serviceDate, setServiceDate] = useState(event.serviceDate);
  const [eventTypeId, setEventTypeId] = useState(event.eventTypeId ?? '');
  const [status, setStatus] = useState(event.status);
  const [startsAtLocal, setStartsAtLocal] = useState(() =>
    toDatetimeLocalValue(event.startsAt),
  );
  const [endsAtLocal, setEndsAtLocal] = useState(() =>
    toDatetimeLocalValue(event.endsAt),
  );
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [clearPoster, setClearPoster] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(event.title);
    setDescription(event.description ?? '');
    setServiceDate(event.serviceDate);
    setEventTypeId(event.eventTypeId ?? '');
    setStatus(EVENT_STATUSES.find((s) => s === event.status) ?? 'scheduled');
    setStartsAtLocal(toDatetimeLocalValue(event.startsAt));
    setEndsAtLocal(toDatetimeLocalValue(event.endsAt));
    setPosterFile(null);
    setClearPoster(false);
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, event]);

  useEffect(() => {
    if (!posterFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(posterFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [posterFile]);

  const handleClose = (): void => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (formEvent: FormEvent): Promise<void> => {
    formEvent.preventDefault();
    if (submitting) return;
    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      let posterMediaId: string | null | undefined;
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
      } else if (clearPoster) {
        posterMediaId = null;
      }

      const payload: Record<string, unknown> = {
        title: title.trim(),
        serviceDate,
        status,
        description: description.trim() ? description.trim() : null,
        eventTypeId: eventTypeId.trim() ? eventTypeId.trim() : null,
        startsAt: localDatetimeToOffsetIso(startsAtLocal),
        endsAt: localDatetimeToOffsetIso(endsAtLocal),
      };
      if (posterMediaId !== undefined) {
        payload.posterMediaId = posterMediaId;
      }

      const updated = await apiFetch<EventRow>(`/api/v1/events/${event.id}`, {
        method: 'PATCH',
        json: payload,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.formError ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Could not save this event.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const existingPosterUrl =
    !clearPoster && !posterFile ? event.posterUrl : null;
  const shownPreview = previewUrl ?? existingPosterUrl;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Edit event"
      description="Update the schedule, type, status, or poster for this gathering."
      size="lg"
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={submitting}
            iconLeft={submitting ? undefined : 'check'}
          >
            {submitting ? 'Saving…' : 'Save changes'}
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

          <Field label="Type" error={fieldErrors.eventTypeId}>
            <Select
              value={eventTypeId}
              onChange={(e) => setEventTypeId(e.target.value)}
            >
              <option value="">No type</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Title" required error={fieldErrors.title}>
            <Input
              data-autofocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={300}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Service date" required error={fieldErrors.serviceDate}>
              <Input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                required
              />
            </Field>
            <Field label="Status" required error={fieldErrors.status}>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
              >
                {EVENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Starts at"
              hint="Optional local time."
              error={fieldErrors.startsAt}
            >
              <Input
                type="datetime-local"
                value={startsAtLocal}
                onChange={(e) => setStartsAtLocal(e.target.value)}
              />
            </Field>
            <Field
              label="Ends at"
              hint="Optional local time."
              error={fieldErrors.endsAt}
            >
              <Input
                type="datetime-local"
                value={endsAtLocal}
                onChange={(e) => setEndsAtLocal(e.target.value)}
              />
            </Field>
          </div>

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
            hint="JPEG, PNG, WebP, or GIF. Leave empty to keep the current poster."
            error={fieldErrors.posterMediaId}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                setPosterFile(e.target.files?.[0] ?? null);
                setClearPoster(false);
              }}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-sm file:text-foreground hover:file:bg-border focus-ring"
            />
          </Field>
          <div className="aspect-[3/4] w-full overflow-hidden rounded-md border border-dashed border-border bg-surface-muted">
            {shownPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shownPreview}
                alt="Poster preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                <span className="inline-flex flex-col items-center gap-2">
                  <Icon name="image" size={24} />
                  No poster
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
              Remove new poster
            </Button>
          ) : event.posterMediaId && !clearPoster ? (
            <Button
              variant="ghost"
              size="sm"
              iconLeft="trash"
              onClick={() => setClearPoster(true)}
            >
              Clear poster
            </Button>
          ) : clearPoster ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setClearPoster(false)}
            >
              Keep current poster
            </Button>
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}

/** `datetime-local` value from an API ISO timestamp (browser local). */
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Convert `datetime-local` to an offset ISO string for
 * `z.string().datetime({ offset: true })`. Empty → null.
 */
function localDatetimeToOffsetIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
