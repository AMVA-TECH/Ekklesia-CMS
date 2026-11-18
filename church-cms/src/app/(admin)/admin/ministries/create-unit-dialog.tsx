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
import type { OrganisationalUnit } from '../../_lib/api-types';

interface CreateUnitDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (unit: OrganisationalUnit) => void;
  parents: readonly OrganisationalUnit[];
}

const KIND_VALUES = [
  'ministry',
  'department',
  'team',
  'branch',
  'life_group',
] as const;

type KindValue = (typeof KIND_VALUES)[number];

export function CreateUnitDialog({
  open,
  onClose,
  onCreated,
  parents,
}: CreateUnitDialogProps): React.ReactElement {
  const to = useTranslations('AdminOrganisation');
  const tc = useTranslations('Common');
  const formId = useId();
  const [kind, setKind] = useState<KindValue>('ministry');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const kindLabel = (value: KindValue): string => {
    switch (value) {
      case 'ministry':
        return to('kindMinistry');
      case 'department':
        return to('kindDepartment');
      case 'team':
        return to('kindTeam');
      case 'branch':
        return to('kindBranch');
      case 'life_group':
        return to('kindLifeGroup');
    }
  };

  const reset = (): void => {
    setKind('ministry');
    setName('');
    setDescription('');
    setParentId('');
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
    const payload: Record<string, unknown> = {
      kind,
      name: name.trim(),
    };
    if (description.trim()) payload.description = description.trim();
    if (parentId) payload.parentId = parentId;
    try {
      const created = await apiFetch<OrganisationalUnit>(
        '/api/v1/organisational-units',
        {
          method: 'POST',
          json: payload,
        },
      );
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
          err instanceof Error ? err.message : to('couldNotCreateUnit'),
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={to('newUnit')}
      description={to('newUnitDesc')}
      size="sm"
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            {tc('cancel')}
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {submitting ? tc('saving') : to('createUnit')}
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

        <Field label={to('kindLabel')} required error={fieldErrors.kind}>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as KindValue)}
          >
            {KIND_VALUES.map((k) => (
              <option key={k} value={k}>
                {kindLabel(k)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={to('nameLabel')}
          required
          hint={to('nameHint')}
          error={fieldErrors.name}
        >
          <Input
            data-autofocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
          />
        </Field>

        <Field label={to('descriptionLabel')} error={fieldErrors.description}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={4000}
          />
        </Field>

        {parents.length > 0 ? (
          <Field
            label={to('parentUnit')}
            hint={to('parentHint')}
            error={fieldErrors.parentId}
          >
            <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">{to('noParent')}</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </form>
    </Dialog>
  );
}
