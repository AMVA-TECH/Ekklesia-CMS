'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { apiFetch, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Button,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Panel,
  Skeleton,
  StatusPill,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/app/_ekklesia/ui';
import type { Person } from '../../../_lib/api-types';
import { FormDialog, InlineAlert, PersonPicker, useRowAction } from '../../../_components/kit';
import { errorMessage, todayLocalIso, toMinorUnits } from '../../../_lib/errors';
import { formatDate, formatMoney, titleCase } from '../../../_lib/format';
import { usePeopleNames } from '../../../_lib/use-people-names';
import type { Project } from '../project-types';
import { t } from '@/app/_ekklesia/i18n/core';

export function ProjectDetailClient({ projectId }: { projectId: string }): React.ReactElement {
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'assign' | 'contribute' | null>(null);
  const { busyKey, run } = useRowAction();

  const load = useCallback(async (): Promise<void> => {
    try {
      setProject(await apiFetch<Project>(`/api/v1/projects/${projectId}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, t('Unable to load this project.')));
    }
  }, [projectId]);
  useLoadEffect(load);

  const names = usePeopleNames([
    ...(project?.assignments ?? []).map((a) => a.personId),
    ...(project?.contributions ?? []).map((c) => c.personId),
    ...(project?.interestRequests ?? []).map((r) => r.personId),
  ]);

  if (error && !project) {
    return (
      <div className="flex flex-col gap-4">
        <InlineAlert>{error}</InlineAlert>
        <Link href="/admin/projects" className="text-sm underline">
          {t('Back to projects')}
        </Link>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton size="block" />
        <Skeleton size="block" />
      </div>
    );
  }

  const raised = project.raisedMinor ?? 0;
  const target = project.targetAmountMinor ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : null;

  const decide = (requestId: string, action: 'accept' | 'decline'): void => {
    void run(
      `${requestId}:${action}`,
      () =>
        apiFetch(`/api/v1/projects/interest-requests/${requestId}/decision`, {
          method: 'POST',
          json: { action },
        }),
      action === 'accept'
        ? { success: t('Volunteer added'), detail: t('They are now assigned to the project.'), failure: t('Could not accept') }
        : { success: t('Interest declined'), failure: t('Could not decline') },
    ).then((ok) => {
      if (ok) void load();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/admin/projects">{t('Projects')}</Link>}
        title={project.name}
        lede={project.description ?? undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" iconLeft="user-plus" onClick={() => setDialog('assign')}>
              {t('Assign person')}
            </Button>
            <Button iconLeft="coin" onClick={() => setDialog('contribute')}>
              {t('Record contribution')}
            </Button>
          </div>
        }
      />

      <Panel title={t('Progress')}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {formatMoney(raised, project.currency)}
            </span>
            <span className="text-sm text-muted-foreground">
              {target > 0 ? t('of {0} goal', formatMoney(target, project.currency)) : t('No goal set')}
            </span>
          </div>
          {pct !== null ? (
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t('Raised against goal')}
            >
              <div className="h-full bg-brand-gold" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <StatusPill tone={project.status === 'active' ? 'success' : 'neutral'}>
              {titleCase(project.status)}
            </StatusPill>
            <span>
              {project.startsOn ? formatDate(project.startsOn) : t('Open start')} –{' '}
              {project.endsOn ? formatDate(project.endsOn) : t('ongoing')}
            </span>
          </div>
        </div>
      </Panel>

      <Panel
        title={t('Volunteer interest')}
        subtitle={t('Members who asked to help. Accepting assigns them to the project.')}
        flush
      >
        {(project.interestRequests ?? []).length === 0 ? (
          <EmptyState icon="hand" tone="neutral" title={t('No pending interest')} />
        ) : (
          <TableWrap>
            <Table>
              <TBody>
                {project.interestRequests!.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium text-foreground">{names[r.personId] ?? '…'}</TD>
                    <TD className="text-sm text-muted-foreground">{r.note ?? ''}</TD>
                    <TD className="text-sm text-muted-foreground">{formatDate(r.createdAt)}</TD>
                    <TD className="text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          loading={busyKey === `${r.id}:accept`}
                          disabled={busyKey !== null}
                          onClick={() => decide(r.id, 'accept')}
                        >
                          {t('Accept')}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyKey === `${r.id}:decline`}
                          disabled={busyKey !== null}
                          onClick={() => decide(r.id, 'decline')}
                        >
                          {t('Decline')}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={t('Team')} subtitle={t('{0} people', project.assignments?.length ?? 0)} flush>
          {(project.assignments ?? []).length === 0 ? (
            <EmptyState icon="users" tone="neutral" title={t('Nobody assigned yet')} />
          ) : (
            <TableWrap>
              <Table>
                <TBody>
                  {project.assignments!.map((a) => (
                    <TR key={a.id}>
                      <TD>
                        <Link href={`/admin/people/${a.personId}`} className="font-medium hover:underline">
                          {names[a.personId] ?? '…'}
                        </Link>
                      </TD>
                      <TD className="text-sm text-muted-foreground">{a.role ?? t('Volunteer')}</TD>
                      <TD>
                        <StatusPill tone={a.status === 'active' ? 'success' : 'neutral'}>
                          {titleCase(a.status)}
                        </StatusPill>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Panel>

        <Panel title={t('Contributions')} subtitle={t('{0} recorded', project.contributions?.length ?? 0)} flush>
          {(project.contributions ?? []).length === 0 ? (
            <EmptyState icon="coin" tone="neutral" title={t('No contributions yet')} />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR noHover>
                    <TH>{t('Date')}</TH>
                    <TH>{t('From')}</TH>
                    <TH className="text-right">{t('Amount')}</TH>
                  </TR>
                </THead>
                <TBody>
                  {project.contributions!.map((c) => (
                    <TR key={c.id}>
                      <TD className="text-sm">{formatDate(c.contributedOn)}</TD>
                      <TD className="text-sm">{c.personId ? (names[c.personId] ?? '…') : t('Anonymous')}</TD>
                      <TD className="text-right tabular-nums">{formatMoney(c.amountMinor, c.currency)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Panel>
      </div>

      {dialog === 'assign' ? (
        <AssignDialog
          projectId={project.id}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            void load();
          }}
        />
      ) : null}
      {dialog === 'contribute' ? (
        <ContributionDialog
          projectId={project.id}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function AssignDialog({
  projectId,
  onClose,
  onDone,
}: {
  projectId: string;
  onClose: () => void;
  onDone: () => void;
}): React.ReactElement {
  const [person, setPerson] = useState<Person | null>(null);
  const [role, setRole] = useState('');
  return (
    <FormDialog
      title={t('Assign person')}
      submitLabel={t('Assign')}
      size="sm"
      onClose={onClose}
      validate={(): Record<string, string> => (person ? {} : { personId: 'Pick a person.' })}
      onSubmit={async () => {
        await apiFetch(`/api/v1/projects/${projectId}/assignments`, {
          method: 'POST',
          json: { personId: person!.id, ...(role.trim() ? { role: role.trim() } : {}) },
        });
        onDone();
      }}
    >
      {(errors) => (
        <>
          <PersonPicker required value={person} onChange={setPerson} error={errors.personId} />
          <Field label={t('Role')} hint={t('Optional, e.g. Coordinator.')} error={errors.role}>
            <Input value={role} onChange={(e) => setRole(e.target.value)} maxLength={100} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

function ContributionDialog({
  projectId,
  onClose,
  onDone,
}: {
  projectId: string;
  onClose: () => void;
  onDone: () => void;
}): React.ReactElement {
  const [amount, setAmount] = useState('');
  const [contributedOn, setContributedOn] = useState(todayLocalIso);
  const [person, setPerson] = useState<Person | null>(null);
  return (
    <FormDialog
      title={t('Record contribution')}
      submitLabel={t('Record')}
      size="sm"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (toMinorUnits(amount) === null) e.amountMinor = t('Enter an amount greater than zero.');
        if (!contributedOn) e.contributedOn = t('Choose a date.');
        return e;
      }}
      onSubmit={async () => {
        await apiFetch(`/api/v1/projects/${projectId}/contributions`, {
          method: 'POST',
          json: {
            amountMinor: toMinorUnits(amount),
            contributedOn,
            ...(person ? { personId: person.id } : {}),
          },
        });
        onDone();
      }}
    >
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('Amount (TZS)')} required error={errors.amountMinor}>
              <Input
                data-autofocus
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label={t('Date')} required error={errors.contributedOn}>
              <Input
                type="date"
                value={contributedOn}
                onChange={(e) => setContributedOn(e.target.value)}
              />
            </Field>
          </div>
          <PersonPicker label={t('Contributor (optional)')} value={person} onChange={setPerson} error={errors.personId} />
        </>
      )}
    </FormDialog>
  );
}
