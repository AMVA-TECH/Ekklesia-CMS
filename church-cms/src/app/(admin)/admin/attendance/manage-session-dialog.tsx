'use client';

import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  Dialog,
  DialogFooter,
  Field,
  Input,
  StatusPill,
} from '@/app/_ekklesia/ui';
import type { Person } from '../../_lib/api-types';
import { asList } from '../../_lib/list';
import { formatDateTime, titleCase } from '../../_lib/format';
import { extractValidationErrors } from '../people/form-errors';
import type { AttendanceRecord, AttendanceSession } from './attendance-types';

interface ManageSessionDialogProps {
  open: boolean;
  session: AttendanceSession | null;
  eventTitle: string;
  onClose: () => void;
  onChanged: (session: AttendanceSession) => void;
}

/**
 * Record people / headcount and finalize an open session against live APIs:
 * - `GET/POST …/attendance-sessions/:id/records`
 * - `PUT …/attendance-sessions/:id/summary`
 * - `POST …/attendance-sessions/:id/finalize`
 */
export function ManageSessionDialog({
  open,
  session,
  eventTitle,
  onClose,
  onChanged,
}: ManageSessionDialogProps): React.ReactElement {
  const formId = useId();
  const [current, setCurrent] = useState<AttendanceSession | null>(session);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [nameByPersonId, setNameByPersonId] = useState<Record<string, string>>(
    {},
  );
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [personId, setPersonId] = useState('');
  const [searching, setSearching] = useState(false);
  const [recording, setRecording] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [menCount, setMenCount] = useState('0');
  const [womenCount, setWomenCount] = useState('0');
  const [childrenCount, setChildrenCount] = useState('0');
  const [visitorsCount, setVisitorsCount] = useState('0');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const isOpen = current?.status === 'open';
  const isHeadcount = current?.mode === 'headcount';
  const allowsRecords =
    current?.mode === 'roll_call' || current?.mode === 'qr_mixed';
  const allowsSummary =
    current?.mode === 'headcount' || current?.mode === 'qr_mixed';

  const loadRecords = useCallback(async (sessionId: string): Promise<void> => {
    setLoadingRecords(true);
    try {
      const payload = await apiFetch<
        AttendanceRecord[] | { data: AttendanceRecord[] }
      >(`/api/v1/attendance-sessions/${sessionId}/records`);
      const list = asList(payload);
      setRecords(list);

      const ids = [
        ...new Set(
          list
            .map((r) => r.personId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0),
        ),
      ];
      if (ids.length === 0) return;

      const settled = await Promise.allSettled(
        ids.map(async (id) => {
          const person = await apiFetch<Person>(`/api/v1/people/${id}`);
          return [id, person.displayName] as const;
        }),
      );
      const next: Record<string, string> = {};
      for (const result of settled) {
        if (result.status === 'fulfilled') {
          const [id, name] = result.value;
          next[id] = name;
        }
      }
      setNameByPersonId((prev) => ({ ...prev, ...next }));
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unable to load session records.',
      );
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !session) return;
    setCurrent(session);
    setQuery('');
    setResults([]);
    setPersonId('');
    setConfirmFinalize(false);
    setFieldErrors({});
    setFormError(null);
    setRecording(false);
    setSavingSummary(false);
    setFinalizing(false);
    setMenCount(String(session.summary?.menCount ?? 0));
    setWomenCount(String(session.summary?.womenCount ?? 0));
    setChildrenCount(String(session.summary?.childrenCount ?? 0));
    setVisitorsCount(String(session.summary?.visitorsCount ?? 0));
    if (session.mode === 'roll_call' || session.mode === 'qr_mixed') {
      void loadRecords(session.id);
    } else {
      setRecords([]);
    }
  }, [open, session, loadRecords]);

  useEffect(() => {
    if (!open || !isOpen || !allowsRecords) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const payload = await apiFetch<Person[] | { data: Person[] }>(
            `/api/v1/people?q=${encodeURIComponent(q)}&limit=10`,
          );
          setResults(asList(payload));
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, open, isOpen, allowsRecords]);

  const handleClose = (): void => {
    if (recording || savingSummary || finalizing) return;
    onClose();
  };

  const applySession = (next: AttendanceSession): void => {
    setCurrent(next);
    onChanged(next);
  };

  const handleRecord = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!current || !isOpen || recording) return;
    if (!personId) {
      setFieldErrors({ personId: 'Pick a person from the search results.' });
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setRecording(true);
    try {
      const updated = await apiFetch<AttendanceSession>(
        `/api/v1/attendance-sessions/${current.id}/records`,
        {
          method: 'POST',
          json: {
            personId,
            presence: 'present',
            source: 'roll_call',
          },
        },
      );
      const selected = results.find((p) => p.id === personId);
      if (selected) {
        setNameByPersonId((prev) => ({
          ...prev,
          [selected.id]: selected.displayName,
        }));
      }
      applySession(updated);
      setQuery('');
      setPersonId('');
      setResults([]);
      await loadRecords(current.id);
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.formError ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Could not record attendance.',
        );
      }
    } finally {
      setRecording(false);
    }
  };

  const handleSaveSummary = async (): Promise<void> => {
    if (!current || !isOpen || savingSummary) return;
    const men = Number(menCount);
    const women = Number(womenCount);
    const children = Number(childrenCount);
    const visitors = Number(visitorsCount);
    const nextErrors: Record<string, string> = {};
    if (!Number.isInteger(men) || men < 0) nextErrors.menCount = 'Enter a whole number.';
    if (!Number.isInteger(women) || women < 0) {
      nextErrors.womenCount = 'Enter a whole number.';
    }
    if (!Number.isInteger(children) || children < 0) {
      nextErrors.childrenCount = 'Enter a whole number.';
    }
    if (!Number.isInteger(visitors) || visitors < 0) {
      nextErrors.visitorsCount = 'Enter a whole number.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSavingSummary(true);
    try {
      const updated = await apiFetch<AttendanceSession>(
        `/api/v1/attendance-sessions/${current.id}/summary`,
        {
          method: 'PUT',
          json: {
            menCount: men,
            womenCount: women,
            childrenCount: children,
            visitorsCount: visitors,
          },
        },
      );
      applySession(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        const parsed = extractValidationErrors(err);
        if (parsed.fieldErrors) setFieldErrors(parsed.fieldErrors);
        setFormError(parsed.formError ?? err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Could not save headcount.',
        );
      }
    } finally {
      setSavingSummary(false);
    }
  };

  const handleFinalize = async (): Promise<void> => {
    if (!current || !isOpen || finalizing) return;
    if (!confirmFinalize) {
      setConfirmFinalize(true);
      return;
    }
    setFormError(null);
    setFinalizing(true);
    try {
      const updated = await apiFetch<AttendanceSession>(
        `/api/v1/attendance-sessions/${current.id}/finalize`,
        { method: 'POST' },
      );
      applySession(updated);
      setConfirmFinalize(false);
    } catch (err) {
      setConfirmFinalize(false);
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : 'Could not finalize session.',
        );
      }
    } finally {
      setFinalizing(false);
    }
  };

  const busy = recording || savingSummary || finalizing;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={eventTitle || 'Attendance session'}
      description={
        current
          ? `${titleCase(current.mode.replaceAll('_', ' '))} · ${
              isOpen ? 'Open' : 'Finalized'
            }`
          : 'Manage attendance for this event.'
      }
      size="lg"
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={busy}>
            Close
          </Button>
          {isOpen ? (
            confirmFinalize ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmFinalize(false)}
                  disabled={finalizing}
                >
                  Not yet
                </Button>
                <Button
                  variant="primary"
                  loading={finalizing}
                  onClick={() => {
                    void handleFinalize();
                  }}
                >
                  {finalizing ? 'Finalizing…' : 'Yes, finalize'}
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                iconLeft="check-circle"
                disabled={busy}
                onClick={() => {
                  void handleFinalize();
                }}
              >
                Finalize session
              </Button>
            )
          ) : null}
        </DialogFooter>
      }
    >
      {!current ? (
        <p className="text-sm text-muted-foreground">No session selected.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {formError ? (
            <div
              role="alert"
              className="rounded-md border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm text-[color:var(--danger-ink)]"
            >
              {formError}
            </div>
          ) : null}

          {confirmFinalize ? (
            <div
              role="status"
              className="rounded-md border border-[color:var(--warning-soft)] bg-[color:var(--warning-soft)] px-3 py-2 text-sm text-[color:var(--warning-ink)]"
            >
              Finalizing locks this session. You will not be able to add more
              records afterward.
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusPill tone={isOpen ? 'info' : 'success'}>
              {isOpen ? 'Open' : 'Finalized'}
            </StatusPill>
            <Badge tone="neutral">{titleCase(current.mode.replaceAll('_', ' '))}</Badge>
            <span className="text-muted-foreground">
              {current.recordCount ?? 0}{' '}
              {(current.recordCount ?? 0) === 1 ? 'record' : 'records'}
            </span>
            {current.summary ? (
              <span className="text-muted-foreground">
                · Headcount {current.summary.totalCount}
              </span>
            ) : null}
          </div>

          {allowsRecords ? (
            <section className="flex flex-col gap-3" aria-labelledby="record-people">
              <h3 id="record-people" className="text-sm font-medium text-foreground">
                People present
              </h3>
              {isOpen ? (
                <form
                  id={formId}
                  onSubmit={(e) => {
                    void handleRecord(e);
                  }}
                  className="flex flex-col gap-3"
                >
                  <Field
                    label="Add person"
                    required
                    hint={searching ? 'Searching…' : 'Type at least 2 letters'}
                    error={fieldErrors.personId}
                  >
                    <Input
                      data-autofocus
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPersonId('');
                      }}
                      placeholder="Search by name…"
                      disabled={recording}
                    />
                  </Field>
                  {results.length > 0 ? (
                    <ul className="max-h-40 overflow-y-auto rounded-md border border-border">
                      {results.map((p) => {
                        const active = p.id === personId;
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setPersonId(p.id);
                                setQuery(p.displayName);
                              }}
                              className={`flex w-full px-3 py-2 text-left text-sm focus-ring ${
                                active
                                  ? 'bg-[color:var(--brand-gold-tint)]'
                                  : 'hover:bg-surface-muted'
                              }`}
                            >
                              <span className="font-medium">{p.displayName}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  <div>
                    <Button
                      type="submit"
                      size="sm"
                      loading={recording}
                      iconLeft={recording ? undefined : 'user-plus'}
                      disabled={!personId}
                    >
                      {recording ? 'Recording…' : 'Mark present'}
                    </Button>
                  </div>
                </form>
              ) : null}

              {loadingRecords ? (
                <p className="text-sm text-muted-foreground">Loading records…</p>
              ) : records.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No people recorded yet.
                </p>
              ) : (
                <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border">
                  {records.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {r.personId
                            ? (nameByPersonId[r.personId] ??
                              r.checkInName ??
                              'Person')
                            : (r.checkInName ?? 'Guest')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(r.checkedInAt)} · {titleCase(r.presence)}
                        </p>
                      </div>
                      <Badge tone="sage">{titleCase(r.source.replaceAll('_', ' '))}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {allowsSummary ? (
            <section className="flex flex-col gap-3" aria-labelledby="headcount">
              <h3 id="headcount" className="text-sm font-medium text-foreground">
                {isHeadcount ? 'Headcount' : 'Optional headcount'}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Men" error={fieldErrors.menCount}>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={menCount}
                    disabled={!isOpen || savingSummary}
                    onChange={(e) => setMenCount(e.target.value)}
                  />
                </Field>
                <Field label="Women" error={fieldErrors.womenCount}>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={womenCount}
                    disabled={!isOpen || savingSummary}
                    onChange={(e) => setWomenCount(e.target.value)}
                  />
                </Field>
                <Field label="Children" error={fieldErrors.childrenCount}>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={childrenCount}
                    disabled={!isOpen || savingSummary}
                    onChange={(e) => setChildrenCount(e.target.value)}
                  />
                </Field>
                <Field label="Visitors" error={fieldErrors.visitorsCount}>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={visitorsCount}
                    disabled={!isOpen || savingSummary}
                    onChange={(e) => setVisitorsCount(e.target.value)}
                  />
                </Field>
              </div>
              {isOpen ? (
                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={savingSummary}
                    onClick={() => {
                      void handleSaveSummary();
                    }}
                  >
                    {savingSummary ? 'Saving…' : 'Save headcount'}
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
