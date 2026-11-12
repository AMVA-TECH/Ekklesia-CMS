'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Button,
  Dialog,
  DialogFooter,
  Field,
  Select,
} from '@/app/_ekklesia/ui';
import type { EventRow } from '../../_lib/api-types';
import { extractValidationErrors } from '../people/form-errors';
import {
  ATTENDANCE_MODE_OPTIONS,
  type AttendanceModeOption,
  type AttendanceSession,
} from './attendance-types';

interface OpenSessionDialogProps {
  open: boolean;
  events: readonly EventRow[];
  /** When set, the event select is locked to this event. */
  presetEventId?: string | null;
  onClose: () => void;
  onOpened: (session: AttendanceSession, event: EventRow) => void;
}

/**
 * Open an attendance session for an event —
 * `POST /api/v1/events/:id/attendance-sessions`.
 */
export function OpenSessionDialog({
  open,
  events,
  presetEventId = null,
  onClose,
  onOpened,
}: OpenSessionDialogProps): React.ReactElement {
  const formId = useId();
  const [eventId, setEventId] = useState('');
  const [mode, setMode] = useState<AttendanceModeOption>('roll_call');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const preferred =
      presetEventId && events.some((e) => e.id === presetEventId)
        ? presetEventId
        : (events[0]?.id ?? '');
    setEventId(preferred);
    setMode('roll_call');
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
  }, [open, presetEventId, events]);

  const handleClose = (): void => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (submitting) return;
    if (!eventId) {
      setFieldErrors({ eventId: 'Choose an event to record attendance for.' });
      return;
    }
    const selected = events.find((e) => e.id === eventId);
    if (!selected) {
      setFieldErrors({ eventId: 'That event is no longer in the list.' });
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const session = await apiFetch<AttendanceSession>(
        `/api/v1/events/${eventId}/attendance-sessions`,
        {
          method: 'POST',
          json: { mode },
        },
      );
      onOpened(session, selected);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.formError ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Could not open attendance session.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedHint =
    ATTENDANCE_MODE_OPTIONS.find((m) => m.value === mode)?.hint ?? '';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Open attendance session"
      description="Start recording who came to this gathering. You can add people or a headcount, then finalize when done."
      size="md"
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={submitting}
            iconLeft={submitting ? undefined : 'plus'}
          >
            {submitting ? 'Opening…' : 'Open session'}
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

        <Field label="Event" required error={fieldErrors.eventId}>
          <Select
            data-autofocus
            value={eventId}
            disabled={Boolean(presetEventId) || events.length === 0}
            onChange={(e) => setEventId(e.target.value)}
          >
            {events.length === 0 ? (
              <option value="">No recent events</option>
            ) : (
              events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))
            )}
          </Select>
        </Field>

        <Field label="How will you record?" hint={selectedHint} error={fieldErrors.mode}>
          <Select
            value={mode}
            onChange={(e) => setMode(e.target.value as AttendanceModeOption)}
          >
            {ATTENDANCE_MODE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Dialog>
  );
}
