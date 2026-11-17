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
import { asList } from '../../../_lib/list';
import { titleCase } from '../../../_lib/format';
import { extractValidationErrors } from '../../people/form-errors';
import type { AnnouncementRow } from '../announcements/create-announcement-dialog';
import type { MessageTemplateRow } from '../templates/create-template-dialog';

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
 * Optionally start from a saved template by name.
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
  const [source, setSource] = useState<'custom' | 'template' | 'announcement'>(
    'custom',
  );
  const [templateId, setTemplateId] = useState('');
  const [announcementId, setAnnouncementId] = useState('');
  const [templates, setTemplates] = useState<MessageTemplateRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const reset = (): void => {
    setChannel('sms');
    setAudienceType('all_members');
    setTitle('');
    setBody('');
    setSource('custom');
    setTemplateId('');
    setAnnouncementId('');
    setFieldErrors({});
    setFormError(null);
    setSubmitting(false);
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadLists = async (): Promise<void> => {
      setListsLoading(true);
      try {
        const [templatesPayload, announcementsPayload] = await Promise.all([
          apiFetch<MessageTemplateRow[] | { data: MessageTemplateRow[] }>(
            '/api/v1/message-templates',
          ).catch(() => []),
          apiFetch<AnnouncementRow[] | { data: AnnouncementRow[] }>(
            '/api/v1/announcements',
          ).catch(() => []),
        ]);
        if (!cancelled) {
          setTemplates(
            asList(templatesPayload).map((row) => ({
              ...row,
              name: row.name || titleCase(row.code.replaceAll('_', ' ')),
            })),
          );
          setAnnouncements(
            asList(announcementsPayload).filter(
              (row) => row.status === 'published',
            ),
          );
        }
      } catch {
        if (!cancelled) {
          setTemplates([]);
          setAnnouncements([]);
        }
      } finally {
        if (!cancelled) setListsLoading(false);
      }
    };
    void loadLists();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const channelTemplates = templates.filter((t) => t.channel === channel);

  const handleClose = (): void => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSourceChange = (next: string): void => {
    const value = next as 'custom' | 'template' | 'announcement';
    setSource(value);
    setTemplateId('');
    setAnnouncementId('');
    if (value === 'custom') return;
  };

  const handleTemplateChange = (nextId: string): void => {
    setTemplateId(nextId);
    setAnnouncementId('');
    if (!nextId) return;
    const selected = channelTemplates.find((t) => t.id === nextId);
    if (selected) {
      setBody(selected.body);
      if (!title.trim()) setTitle(selected.name);
    }
  };

  const handleAnnouncementChange = (nextId: string): void => {
    setAnnouncementId(nextId);
    setTemplateId('');
    if (!nextId) return;
    const selected = announcements.find((a) => a.id === nextId);
    if (selected) {
      setBody(selected.body);
      setTitle(selected.title);
    }
  };

  const handleChannelChange = (nextChannel: string): void => {
    setChannel(nextChannel);
    if (source === 'template') {
      setTemplateId('');
    }
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
      if (source === 'template' && templateId) payload.templateId = templateId;
      if (source === 'announcement' && announcementId) {
        payload.announcementId = announcementId;
      }

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
              onChange={(e) => handleChannelChange(e.target.value)}
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

        <Field
          label="Start from"
          hint={
            listsLoading
              ? 'Loading saved messages…'
              : 'Optional. Pick a saved template or published announcement, then edit if needed.'
          }
        >
          <Select
            value={source}
            onChange={(e) => handleSourceChange(e.target.value)}
            disabled={listsLoading}
          >
            <option value="custom">Write a new message</option>
            <option value="template">Saved template</option>
            <option value="announcement">Published announcement</option>
          </Select>
        </Field>

        {source === 'template' ? (
          <Field
            label="Template"
            required
            hint={
              channelTemplates.length === 0
                ? 'No templates for this channel yet.'
                : undefined
            }
            error={fieldErrors.templateId}
          >
            <Select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              disabled={channelTemplates.length === 0}
            >
              <option value="">Choose a template…</option>
              {channelTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {source === 'announcement' ? (
          <Field
            label="Announcement"
            required
            hint={
              announcements.length === 0
                ? 'No published announcements yet.'
                : undefined
            }
            error={fieldErrors.announcementId}
          >
            <Select
              value={announcementId}
              onChange={(e) => handleAnnouncementChange(e.target.value)}
              disabled={announcements.length === 0}
            >
              <option value="">Choose an announcement…</option>
              {announcements.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label="Title" hint="Optional label for this job." error={fieldErrors.title}>
          <Input
            data-autofocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sunday reminder"
            maxLength={200}
          />
        </Field>

        <Field label="Message" required error={fieldErrors.body}>
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
