'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [status, setStatus] = useState<(typeof FILTERS)[number]>('active');
  const projects = useApiList<Project>(`/api/v1/projects?status=${status}&limit=100`);
  const funds = useApiList<Fund>('/api/v1/funds');
  const units = useApiList<OrganisationalUnit>('/api/v1/organisational-units?limit=100');
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projects"
        lede="Time-bound efforts with an optional fundraising goal — building works, outreach, missions. Members can express interest to volunteer."
        actions={
          <Button iconLeft="plus" onClick={() => setCreating(true)}>
            New project
          </Button>
        }
      />

      <Tabs value={status} onValueChange={(v) => setStatus(v as (typeof FILTERS)[number])}>
        <TabList aria-label="Project status">
          {FILTERS.map((f) => (
            <Tab key={f} value={f}>
              {titleCase(f)}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={`${titleCase(status)} projects`}
        subtitle={projects.loading ? 'Loading…' : `${projects.items.length} shown`}
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
            title: `No ${status} projects`,
            description: status === 'active' ? 'Start a project to track its goal and volunteers.' : undefined,
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Project</TH>
                  <TH>Runs</TH>
                  <TH className="text-right">Goal</TH>
                  <TH>Status</TH>
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
                      {p.startsOn ? formatDate(p.startsOn) : 'Open start'}
                      {' – '}
                      {p.endsOn ? formatDate(p.endsOn) : 'ongoing'}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {p.targetAmountMinor ? formatMoney(p.targetAmountMinor, p.currency) : '—'}
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [fundId, setFundId] = useState('');
  const [unitId, setUnitId] = useState('');

  return (
    <FormDialog
      title="New project"
      submitLabel="Create project"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = 'Enter a name.';
        if (target.trim() && toMinorUnits(target) === null)
          e.targetAmountMinor = 'Enter a goal greater than zero, or leave it empty.';
        if (startsOn && endsOn && endsOn < startsOn) e.endsOn = 'End must be on or after the start.';
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
          <Field label="Name" required error={errors.name}>
            <Input
              data-autofocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New sanctuary roof"
              maxLength={200}
            />
          </Field>
          <Field label="Description" error={errors.description}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Goal (TZS)" hint="Optional." error={errors.targetAmountMinor}>
              <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
            <Field label="Starts" error={errors.startsOn}>
              <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </Field>
            <Field label="Ends" error={errors.endsOn}>
              <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fund" hint="Where contributions are recorded." error={errors.fundId}>
              <Select value={fundId} onChange={(e) => setFundId(e.target.value)}>
                <option value="">None</option>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ministry / unit" error={errors.organisationalUnitId}>
              <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">Church-wide</option>
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
