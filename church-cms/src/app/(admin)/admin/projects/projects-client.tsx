'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/app/_ekklesia/session';
import {
  Button,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  StatusPill,
  Tab,
  TabList,
  Table,
  TableWrap,
  Tabs,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from '@/app/_ekklesia/ui';
import type { Fund, OrganisationalUnit } from '../../_lib/api-types';
import { FormDialog, ListState } from '../../_components/kit';
import { toMinorUnits } from '../../_lib/errors';
import { formatDate, formatMoney, titleCase } from '../../_lib/format';
import { useApiList } from '../../_lib/use-api-list';
import type { Project } from './project-types';

const FILTERS = ['active', 'closed'] as const;

export function ProjectsClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tp = useTranslations('AdminProjects');
  const tc = useTranslations('Common');
  const router = useRouter();
  const [status, setStatus] = useState<(typeof FILTERS)[number]>('active');
  const projects = useApiList<Project>(`/api/v1/projects?status=${status}&limit=100`);
  const funds = useApiList<Fund>('/api/v1/funds');
  const units = useApiList<OrganisationalUnit>('/api/v1/organisational-units?limit=100');
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('projects')}
        lede={t('projectsLede')}
        actions={
          <Button iconLeft="plus" onClick={() => setCreating(true)}>
            {tp('newProject')}
          </Button>
        }
      />

      <Tabs value={status} onValueChange={(v) => setStatus(v as (typeof FILTERS)[number])}>
        <TabList aria-label={tp('projectStatusAria')}>
          {FILTERS.map((f) => (
            <Tab key={f} value={f}>
              {titleCase(f)}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={tp('statusProjects', { status: titleCase(status) })}
        subtitle={
          projects.loading
            ? tc('loading')
            : tc('shownCount', { count: projects.items.length })
        }
        flush
      >
        <ListState
          loading={projects.loading}
          error={projects.error}
          forbidden={projects.forbidden}
          isEmpty={projects.items.length === 0}
          onRetry={() => void projects.reload()}
          empty={{
            icon: 'briefcase',
            title: tp('noStatusProjects', { status }),
            description:
              status === 'active' ? tp('startProjectBody') : undefined,
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tp('project')}</TH>
                  <TH>{tp('runs')}</TH>
                  <TH className="text-right">{tp('goal')}</TH>
                  <TH>{tp('status')}</TH>
                </TR>
              </THead>
              <TBody>
                {projects.items.map((p) => (
                  <TR key={p.id}>
                    <TD>
                      <Link
                        href={`/admin/projects/${p.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.description ? (
                        <div className="line-clamp-1 text-xs text-muted-foreground">
                          {p.description}
                        </div>
                      ) : null}
                    </TD>
                    <TD className="text-sm text-muted-foreground">
                      {p.startsOn ? formatDate(p.startsOn) : tp('openStart')}
                      {' – '}
                      {p.endsOn ? formatDate(p.endsOn) : tp('ongoing')}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {p.targetAmountMinor
                        ? formatMoney(p.targetAmountMinor, p.currency)
                        : tp('emDash')}
                    </TD>
                    <TD>
                      <StatusPill tone={p.status === 'active' ? 'success' : 'neutral'}>
                        {titleCase(p.status)}
                      </StatusPill>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </ListState>
      </Panel>

      {creating ? (
        <CreateProjectDialog
          funds={funds.items}
          units={units.items}
          onClose={() => setCreating(false)}
          onCreated={(p) => router.push(`/admin/projects/${p.id}`)}
        />
      ) : null}
    </div>
  );
}

function CreateProjectDialog({
  funds,
  units,
  onClose,
  onCreated,
}: {
  funds: Fund[];
  units: OrganisationalUnit[];
  onClose: () => void;
  onCreated: (p: Project) => void;
}): React.ReactElement {
  const tp = useTranslations('AdminProjects');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [fundId, setFundId] = useState('');
  const [unitId, setUnitId] = useState('');

  return (
    <FormDialog
      title={tp('newProjectTitle')}
      submitLabel={tp('createProject')}
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = tp('enterName');
        if (target.trim() && toMinorUnits(target) === null)
          e.targetAmountMinor = tp('enterGoal');
        if (startsOn && endsOn && endsOn < startsOn) e.endsOn = tp('endAfterStart');
        return e;
      }}
      onSubmit={async () => {
        const created = await apiFetch<Project>('/api/v1/projects', {
          method: 'POST',
          json: {
            name: name.trim(),
            ...(description.trim() ? { description: description.trim() } : {}),
            ...(target.trim() ? { targetAmountMinor: toMinorUnits(target) } : {}),
            ...(startsOn ? { startsOn } : {}),
            ...(endsOn ? { endsOn } : {}),
            ...(fundId ? { fundId } : {}),
            ...(unitId ? { organisationalUnitId: unitId } : {}),
          },
        });
        onCreated(created);
      }}
    >
      {(errors) => (
        <>
          <Field label={tp('name')} required error={errors.name}>
            <Input
              data-autofocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tp('namePlaceholder')}
              maxLength={200}
            />
          </Field>
          <Field label={tp('description')} error={errors.description}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={tp('goalTzs')} hint={tp('optional')} error={errors.targetAmountMinor}>
              <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
            <Field label={tp('starts')} error={errors.startsOn}>
              <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </Field>
            <Field label={tp('ends')} error={errors.endsOn}>
              <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tp('fund')} hint={tp('fundHint')} error={errors.fundId}>
              <Select value={fundId} onChange={(e) => setFundId(e.target.value)}>
                <option value="">{tp('none')}</option>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tp('ministryUnit')} error={errors.organisationalUnitId}>
              <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">{tp('churchWide')}</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </>
      )}
    </FormDialog>
  );
}
