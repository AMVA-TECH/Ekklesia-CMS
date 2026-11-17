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
      setError(errorMessage(err, 'Unable to load this project.'));
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
          Back to projects
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
        ? { success: 'Volunteer added', detail: 'They are now assigned to the project.', failure: 'Could not accept' }
        : { success: 'Interest declined', failure: 'Could not decline' },
    ).then((ok) => {
      if (ok) void load();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/admin/projects">Projects</Link>}
        title={project.name}
        lede={project.description ?? undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" iconLeft="user-plus" onClick={() => setDialog('assign')}>
              Assign person
            </Button>
            <Button iconLeft="coin" onClick={() => setDialog('contribute')}>
              Record contribution
            </Button>
          </div>
        }
      />

      <Panel title="Progress">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {formatMoney(raised, project.currency)}
            </span>
            <span className="text-sm text-muted-foreground">
              {target > 0 ? `of ${formatMoney(target, project.currency)} goal` : 'No goal set'}
            </span>
          </div>
          {pct !== null ? (
            <div
              className="h-2 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Raised against goal"
            >
              <div className="h-full bg-brand-gold" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <StatusPill tone={project.status === 'active' ? 'success' : 'neutral'}>
              {titleCase(project.status)}
            </StatusPill>
            <span>
              {project.startsOn ? formatDate(project.startsOn) : 'Open start'} –{' '}
              {project.endsOn ? formatDate(project.endsOn) : 'ongoing'}
            </span>
          </div>
        </div>
      </Panel>

      <Panel
        title="Volunteer interest"
        subtitle="Members who asked to help. Accepting assigns them to the project."
        flush
      >
        {(project.interestRequests ?? []).length === 0 ? (
          <EmptyState icon="hand" tone="neutral" title="No pending interest" />
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
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyKey === `${r.id}:decline`}
                          disabled={busyKey !== null}
                          onClick={() => decide(r.id, 'decline')}
                        >
                          Decline
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
        <Panel title="Team" subtitle={`${project.assignments?.length ?? 0} people`} flush>
          {(project.assignments ?? []).length === 0 ? (
            <EmptyState icon="users" tone="neutral" title="Nobody assigned yet" />
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
                      <TD className="text-sm text-muted-foreground">{a.role ?? 'Volunteer'}</TD>
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

        <Panel title="Contributions" subtitle={`${project.contributions?.length ?? 0} recorded`} flush>
          {(project.contributions ?? []).length === 0 ? (
            <EmptyState icon="coin" tone="neutral" title="No contributions yet" />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <TR noHover>
                    <TH>Date</TH>
                    <TH>From</TH>
                    <TH className="text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {project.contributions!.map((c) => (
                    <TR key={c.id}>
                      <TD className="text-sm">{formatDate(c.contributedOn)}</TD>
                      <TD className="text-sm">{c.personId ? (names[c.personId] ?? '…') : 'Anonymous'}</TD>
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
      title="Assign person"
      submitLabel="Assign"
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
          <Field label="Role" hint="Optional, e.g. Coordinator." error={errors.role}>
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
      title="Record contribution"
      submitLabel="Record"
      size="sm"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (toMinorUnits(amount) === null) e.amountMinor = 'Enter an amount greater than zero.';
        if (!contributedOn) e.contributedOn = 'Choose a date.';
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
            <Field label="Amount (TZS)" required error={errors.amountMinor}>
              <Input
                data-autofocus
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Date" required error={errors.contributedOn}>
              <Input
                type="date"
                value={contributedOn}
                onChange={(e) => setContributedOn(e.target.value)}
              />
            </Field>
          </div>
          <PersonPicker label="Contributor (optional)" value={person} onChange={setPerson} error={errors.personId} />
        </>
      )}
    </FormDialog>
  );
}
