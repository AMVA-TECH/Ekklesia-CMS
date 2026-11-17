'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { apiFetch } from '@/app/_ekklesia/session';
import {
  Button,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from '@/app/_ekklesia/ui';
import type { LeadershipPosition, Person } from '../../../_lib/api-types';
import { FormDialog, ListState, PersonPicker } from '../../../_components/kit';
import { useApiList } from '../../../_lib/use-api-list';
import { usePeopleNames } from '../../../_lib/use-people-names';

interface AppointmentRequest {
  id: string;
  positionId: string;
  personId: string;
  organisationalUnitId: string | null;
  requestedByUserId: string | null;
  status: string;
  reason: string | null;
}

type Deciding = { request: AppointmentRequest; action: 'approve' | 'reject' };

export function AppointmentRequestsClient(): React.ReactElement {
  const requests = useApiList<AppointmentRequest>('/api/v1/appointment-requests');
  const positions = useApiList<LeadershipPosition>('/api/v1/positions?limit=200');
  const names = usePeopleNames(requests.items.map((r) => r.personId));
  const [creating, setCreating] = useState(false);
  const [deciding, setDeciding] = useState<Deciding | null>(null);

  const positionById = useMemo(
    () => new Map(positions.items.map((p) => [p.id, p])),
    [positions.items],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/admin/leadership">Leadership</Link>}
        title="Appointment requests"
        lede="Unit leaders propose someone for a position; a leader with appointment rights approves (creating the appointment) or rejects it."
        actions={
          <Button iconLeft="plus" onClick={() => setCreating(true)}>
            Propose appointment
          </Button>
        }
      />

      <Panel
        title="Pending requests"
        subtitle={requests.loading ? 'Loading…' : `${requests.items.length} waiting`}
        flush
      >
        <ListState
          loading={requests.loading}
          error={requests.error}
          forbidden={requests.forbidden}
          isEmpty={requests.items.length === 0}
          onRetry={() => void requests.reload()}
          empty={{ icon: 'user-plus', title: 'No pending appointment requests' }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Person</TH>
                  <TH>Position</TH>
                  <TH>Reason</TH>
                  <TH className="text-right">Decision</TH>
                </TR>
              </THead>
              <TBody>
                {requests.items.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium text-foreground">
                      <Link href={`/admin/people/${r.personId}`} className="hover:underline">
                        {names[r.personId] ?? '…'}
                      </Link>
                    </TD>
                    <TD className="text-sm">
                      <Link href={`/admin/leadership/${r.positionId}`} className="hover:underline">
                        {positionById.get(r.positionId)?.title ?? 'Position'}
                      </Link>
                    </TD>
                    <TD className="max-w-xs text-sm text-muted-foreground">{r.reason ?? '—'}</TD>
                    <TD className="text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          iconLeft="check"
                          onClick={() => setDeciding({ request: r, action: 'approve' })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDeciding({ request: r, action: 'reject' })}
                        >
                          Reject
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </ListState>
      </Panel>

      {creating ? (
        <ProposeDialog
          positions={positions.items.filter((p) => p.status === 'active')}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            void requests.reload();
          }}
        />
      ) : null}
      {deciding ? (
        <DecideDialog
          deciding={deciding}
          personName={names[deciding.request.personId] ?? 'this person'}
          positionTitle={positionById.get(deciding.request.positionId)?.title ?? 'the position'}
          onClose={() => setDeciding(null)}
          onDone={() => {
            setDeciding(null);
            void requests.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function ProposeDialog({
  positions,
  onClose,
  onDone,
}: {
  positions: LeadershipPosition[];
  onClose: () => void;
  onDone: () => void;
}): React.ReactElement {
  const [positionId, setPositionId] = useState('');
  const [person, setPerson] = useState<Person | null>(null);
  const [reason, setReason] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  return (
    <FormDialog
      title="Propose appointment"
      submitLabel="Send request"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!positionId) e.positionId = 'Choose a position.';
        if (!person) e.personId = 'Pick a person.';
        return e;
      }}
      onSubmit={async () => {
        const position = positions.find((p) => p.id === positionId);
        await apiFetch('/api/v1/appointment-requests', {
          method: 'POST',
          json: {
            positionId,
            personId: person!.id,
            ...(position?.organisationalUnitId
              ? { organisationalUnitId: position.organisationalUnitId }
              : {}),
            ...(reason.trim() ? { reason: reason.trim() } : {}),
            ...(effectiveFrom ? { effectiveFrom } : {}),
          },
        });
        onDone();
      }}
    >
      {(errors) => (
        <>
          <Field label="Position" required error={errors.positionId}>
            <Select data-autofocus value={positionId} onChange={(e) => setPositionId(e.target.value)}>
              <option value="">Choose…</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
          <PersonPicker required value={person} onChange={setPerson} error={errors.personId} />
          <Field label="Start date" hint="Optional." error={errors.effectiveFrom}>
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </Field>
          <Field label="Reason" error={errors.reason}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}

function DecideDialog({
  deciding,
  personName,
  positionTitle,
  onClose,
  onDone,
}: {
  deciding: Deciding;
  personName: string;
  positionTitle: string;
  onClose: () => void;
  onDone: () => void;
}): React.ReactElement {
  const approve = deciding.action === 'approve';
  const [note, setNote] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  return (
    <FormDialog
      title={approve ? 'Approve appointment' : 'Reject request'}
      description={
        approve
          ? `${personName} will be appointed as ${positionTitle}.`
          : `${personName} will not be appointed as ${positionTitle}.`
      }
      submitLabel={approve ? 'Approve' : 'Reject'}
      submitVariant={approve ? 'primary' : 'destructive'}
      size="sm"
      onClose={onClose}
      onSubmit={async () => {
        await apiFetch(`/api/v1/appointment-requests/${deciding.request.id}/decision`, {
          method: 'POST',
          json: {
            action: deciding.action,
            ...(note.trim() ? { note: note.trim() } : {}),
            ...(approve && effectiveFrom ? { effectiveFrom } : {}),
          },
        });
        onDone();
      }}
    >
      {(errors) => (
        <>
          {approve ? (
            <Field label="Effective from" hint="Defaults to the requested date or today." error={errors.effectiveFrom}>
              <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </Field>
          ) : null}
          <Field label="Note" error={errors.note}>
            <Textarea data-autofocus value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} />
          </Field>
        </>
      )}
    </FormDialog>
  );
}
