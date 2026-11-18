'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { ApiError, apiFetch, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Button,
  Card,
  CardSubtitle,
  CardTitle,
  Dialog,
  DialogFooter,
  EmptyState,
  Field,
  PageHeader,
  Skeleton,
  Textarea,
  useToast,
} from '@/app/_ekklesia/ui';
import { formatMoney } from '../_shared/formatters';

interface MemberProject {
  id: string;
  name: string;
  description: string | null;
  targetAmountMinor: number | null;
  currency: string;
  status: 'active' | 'closed';
  startsOn: string | null;
  endsOn: string | null;
}

export function MemberProjectsClient(): React.ReactElement {
  const t = useTranslations('MemberProjects');
  const { push } = useToast();
  const [projects, setProjects] = useState<MemberProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [helping, setHelping] = useState<MemberProject | null>(null);
  const [sent, setSent] = useState<Set<string>>(() => new Set());

  const load = useCallback(async (): Promise<void> => {
    try {
      const data = await apiFetch<MemberProject[]>(
        '/api/v1/projects?status=active&limit=50',
      );
      setProjects(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setProjects([]);
      setError(e instanceof ApiError ? e.message : t('connection'));
    }
  }, [t]);
  useLoadEffect(load);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('title')} lede={t('lede')} />

      {projects === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton size="block" />
          <Skeleton size="block" />
        </div>
      ) : error ? (
        <EmptyState
          icon="alert-circle"
          tone="peach"
          title={t('loadFail')}
          description={error}
          action={
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              {t('tryAgain')}
            </Button>
          }
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon="briefcase"
          tone="gold"
          title={t('empty')}
          description={t('emptyBody')}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Card className="flex h-full flex-col gap-3 p-5">
                <CardTitle>{p.name}</CardTitle>
                {p.targetAmountMinor ? (
                  <CardSubtitle>
                    {t('goal', {
                      amount: formatMoney(p.targetAmountMinor, p.currency),
                    })}
                  </CardSubtitle>
                ) : null}
                {p.description ? (
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                ) : null}
                <div className="mt-auto pt-2">
                  {sent.has(p.id) ? (
                    <p className="text-sm font-medium text-[color:var(--success-ink)]">
                      {t('thanksSent')}
                    </p>
                  ) : (
                    <Button
                      size="sm"
                      iconLeft="hand"
                      onClick={() => setHelping(p)}
                    >
                      {t('idLikeToHelp')}
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {helping ? (
        <InterestDialog
          project={helping}
          onClose={() => setHelping(null)}
          onSent={() => {
            setSent((s) => new Set(s).add(helping.id));
            push({
              tone: 'success',
              title: t('interestSent'),
              message: t('teamReview', { name: helping.name }),
            });
            setHelping(null);
          }}
        />
      ) : null}
    </div>
  );
}

function InterestDialog({
  project,
  onClose,
  onSent,
}: {
  project: MemberProject;
  onClose: () => void;
  onSent: () => void;
}): React.ReactElement {
  const t = useTranslations('MemberProjects');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    setSending(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/projects/${project.id}/interest`, {
        method: 'POST',
        json: note.trim() ? { note: note.trim() } : {},
      });
      onSent();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('sendFail'));
      setSending(false);
    }
  };

  return (
    <Dialog
      open
      onClose={() => {
        if (!sending) onClose();
      }}
      title={t('helpWith', { name: project.name })}
      description={t('helpDesc')}
      size="sm"
      sheetOnMobile
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            {t('cancel')}
          </Button>
          <Button loading={sending} onClick={() => void submit()}>
            {t('send')}
          </Button>
        </DialogFooter>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? (
          <p role="alert" className="text-sm text-[color:var(--danger-ink)]">
            {error}
          </p>
        ) : null}
        <Field label={t('note')}>
          <Textarea
            data-autofocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={t('notePlaceholder')}
          />
        </Field>
      </div>
    </Dialog>
  );
}
