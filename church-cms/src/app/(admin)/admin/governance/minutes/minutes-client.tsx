'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/app/_ekklesia/session';
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  StatusPill,
  Textarea,
} from '@/app/_ekklesia/ui';
import type { OrganisationalUnit } from '../../../_lib/api-types';
import { FormDialog, ListState } from '../../../_components/kit';
import { todayLocalIso } from '../../../_lib/errors';
import { formatDate, titleCase } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';

interface MeetingMinutes {
  id: string;
  organisationalUnitId: string | null;
  title: string;
  meetingDate: string;
  body: string;
  attendees: unknown[];
  status: 'draft' | 'published' | 'archived';
}

const TONE = { draft: 'pending', published: 'success', archived: 'neutral' } as const;

export function MinutesClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tg = useTranslations('AdminGovernance');
  const tc = useTranslations('Common');
  const minutes = useApiList<MeetingMinutes>('/api/v1/meeting-minutes');
  const units = useApiList<OrganisationalUnit>('/api/v1/organisational-units?limit=100');
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const unitById = useMemo(() => new Map(units.items.map((u) => [u.id, u])), [units.items]);
  const sorted = useMemo(
    () => [...minutes.items].sort((a, b) => b.meetingDate.localeCompare(a.meetingDate)),
    [minutes.items],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('minutes')}
        lede={t('minutesLede')}
        actions={
          <Button iconLeft="plus" onClick={() => setCreating(true)}>
            {tg('recordMinutes')}
          </Button>
        }
      />

      <Panel
        title={tg('allMinutes')}
        subtitle={
          minutes.loading
            ? tc('loading')
            : tg('meetingsCount', { count: sorted.length })
        }
      >
        <ListState
          loading={minutes.loading}
          error={minutes.error}
          forbidden={minutes.forbidden}
          isEmpty={sorted.length === 0}
          onRetry={() => void minutes.reload()}
          empty={{ icon: 'file', title: tg('noMinutes') }}
        >
          <ul className="flex flex-col gap-3">
            {sorted.map((m) => {
              const expanded = open === m.id;
              const attendees = m.attendees.filter((a): a is string => typeof a === 'string');
              return (
                <li key={m.id}>
                  <Card className="p-4">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : m.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-2 text-left focus-ring"
                    >
                      <span>
                        <span className="block font-medium text-foreground">{m.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(m.meetingDate)}
                          {m.organisationalUnitId
                            ? ` · ${unitById.get(m.organisationalUnitId)?.name ?? ''}`
                            : tg('churchWideDot')}
                        </span>
                      </span>
                      <StatusPill tone={TONE[m.status]}>{titleCase(m.status)}</StatusPill>
                    </button>
                    {expanded ? (
                      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                        <p className="whitespace-pre-wrap text-sm text-foreground">{m.body}</p>
                        {attendees.length > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            {tg('presentLabel', { names: attendees.join(', ') })}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        </ListState>
      </Panel>

      {creating ? (
        <CreateMinutesDialog
          units={units.items}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void minutes.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function CreateMinutesDialog({
  units,
  onClose,
  onCreated,
}: {
  units: OrganisationalUnit[];
  onClose: () => void;
  onCreated: () => void;
}): React.ReactElement {
  const tg = useTranslations('AdminGovernance');
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(todayLocalIso);
  const [unitId, setUnitId] = useState('');
  const [body, setBody] = useState('');
  const [attendees, setAttendees] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');

  return (
    <FormDialog
      title={tg('recordMinutesTitle')}
      submitLabel={tg('saveMinutes')}
      size="lg"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!title.trim()) e.title = tg('enterTitle');
        if (!meetingDate) e.meetingDate = tg('chooseMeetingDate');
        if (!body.trim()) e.body = tg('writeMinutes');
        return e;
      }}
      onSubmit={async () => {
        const names = attendees
          .split(/[\n,]/)
          .map((n) => n.trim())
          .filter(Boolean);
        await apiFetch('/api/v1/meeting-minutes', {
          method: 'POST',
          json: {
            title: title.trim(),
            meetingDate,
            body: body.trim(),
            status,
            ...(unitId ? { organisationalUnitId: unitId } : {}),
            ...(names.length ? { attendees: names } : {}),
          },
        });
        onCreated();
      }}
    >
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label={tg('title')} required error={errors.title}>
              <Input
                data-autofocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tg('titlePlaceholder')}
                maxLength={300}
              />
            </Field>
            <Field label={tg('meetingDate')} required error={errors.meetingDate}>
              <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tg('ministryUnit')} error={errors.organisationalUnitId}>
              <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">{tg('churchWide')}</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tg('status')} error={errors.status}>
              <Select value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}>
                <option value="published">{tg('published')}</option>
                <option value="draft">{tg('draft')}</option>
              </Select>
            </Field>
          </div>
          <Field label={tg('minutes')} required error={errors.body}>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} maxLength={50000} />
          </Field>
          <Field label={tg('present')} hint={tg('presentHint')} error={errors.attendees}>
            <Textarea value={attendees} onChange={(e) => setAttendees(e.target.value)} rows={2} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
