'use client';

import { useTranslations } from 'next-intl';

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

export function ProjectDetailClient({ projectId }: { projectId: string }): React.ReactElement {
  const tp = useTranslations('AdminProjects');
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'assign' | 'contribute' | null>(null);
  const { busyKey, run } = useRowAction();

  const load = useCallback(async (): Promise<void> => {
    try {
      setProject(await apiFetch<Project>(`/api/v1/projects/${projectId}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, tp('unableLoad')));
    }
  }, [projectId, tp]);
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
          {tp('backToProjects')}
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
        ? { success: tp('volunteerAdded'), detail: tp('volunteerAddedDetail'), failure: tp('couldNotAccept') }
        : { success: tp('interestDeclined'), failure: tp('couldNotDecline') },
    ).then((ok) => {
      if (ok) void load();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/admin/projects">{tp('projects')}</Link>}
        title={project.name}
        lede={project.description ?? undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" iconLeft="user-plus" onClick={() => setDialog('assign')}>
              {tp('assignPerson')}
            </Button>
            <Button iconLeft="coin" onClick={() => setDialog('contribute')}>
              {tp('recordContribution')}
            </Button>
          </div>
        }
      />

      <Panel title={tp('progress')}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {formatMoney(raised, project.currency)}
            </span>
            <span className="text-sm text-muted-foreground">
              {target > 0 ? tp('ofGoal', { amount: formatMoney(target, project.currency) }) : tp('noGoalSet')}
            </span>
          </div>
          {pct !== null ? (
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={tp('raisedAria')}
            >
              <div className="h-full bg-brand-gold" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <StatusPill tone={project.status === 'active' ? 'success' : 'neutral'}>
              {titleCase(project.status)}
            </StatusPill>
            <span>
              {project.startsOn ? formatDate(project.startsOn) : tp('openStart')} –{' '}
              {project.endsOn ? formatDate(project.endsOn) : tp('ongoing')}
            </span>
          </div>
        </div>
      </Panel>

      <Panel
        title={tp('volunteerInterest')}
        subtitle={tp('volunteerInterestSubtitle')}
        flush
      >
        {(project.interestRequests ?? []).length === 0 ? (
          <EmptyState icon="hand" tone="neutral" title={tp('noPendingInterest')} />
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
                          {tp('accept')}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyKey === `${r.id}:decline`}
                          disabled={busyKey !== null}
                          onClick={() => decide(r.id, 'decline')}
                        >
                          {tp('decline')}
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
        <Panel title={tp('team')} subtitle={tp('peopleCount', { count: project.assignments?.length ?? 0 })} flush>
          {(project.assignments ?? []).length === 0 ? (
            <EmptyState icon="users" tone="neutral" title={tp('nobodyAssigned')} />
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
                      <TD className="text-sm text-muted-foreground">{a.role ?? tp('volunteer')}</TD>
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

        <Panel title={tp('contributions')} subtitle={tp('recordedCount', { count: project.contributions?.length ?? 0 })} flush>
          {(project.contributions ?? []).length === 0 ? (
            <EmptyState icon="coin" tone="neutral" title={tp('noContributions')} />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR noHover>
                    <TH>{tp('date')}</TH>
                    <TH>{tp('from')}</TH>
                    <TH className="text-right">{tp('amount')}</TH>
                  </TR>
                </THead>
                <TBody>
                  {project.contributions!.map((c) => (
                    <TR key={c.id}>
                      <TD className="text-sm">{formatDate(c.contributedOn)}</TD>
                      <TD className="text-sm">{c.personId ? (names[c.personId] ?? '…') : tp('anonymous')}</TD>
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
  const tp = useTranslations('AdminProjects');
  const [person, setPerson] = useState<Person | null>(null);
  const [role, setRole] = useState('');
  return (
    <FormDialog
      title={tp('assignPerson')}
      submitLabel={tp('assign')}
      size="sm"
      onClose={onClose}
      validate={(): Record<string, string> => (person ? {} : { personId: tp('pickPerson') })}
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
          <Field label={tp('role')} hint={tp('roleHint')} error={errors.role}>
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
  const tp = useTranslations('AdminProjects');
  const [amount, setAmount] = useState('');
  const [contributedOn, setContributedOn] = useState(todayLocalIso);
  const [person, setPerson] = useState<Person | null>(null);
  return (
    <FormDialog
      title={tp('recordContribution')}
      submitLabel={tp('record')}
      size="sm"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (toMinorUnits(amount) === null) e.amountMinor = tp('amountGtZero');
        if (!contributedOn) e.contributedOn = tp('chooseDate');
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
            <Field label={tp('amountTzs')} required error={errors.amountMinor}>
              <Input
                data-autofocus
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label={tp('date')} required error={errors.contributedOn}>
              <Input
                type="date"
                value={contributedOn}
                onChange={(e) => setContributedOn(e.target.value)}
              />
            </Field>
          </div>
          <PersonPicker label={tp('contributorOptional')} value={person} onChange={setPerson} error={errors.personId} />
        </>
      )}
    </FormDialog>
  );
}
