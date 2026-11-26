'use client';

import Link from 'next/link';
import {
  FormEvent,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLoadEffect } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  Skeleton,
  buttonClassName,
} from '@/app/_ekklesia/ui';
import { ConsoleHeader } from '../../../console-header';
import { humanizePlatformError, platformApi } from '../../../platform-api';

type KycState = 'pending' | 'pass' | 'fail' | 'na';
type KycKey =
  | 'email_verified'
  | 'church_identity'
  | 'location_plausible'
  | 'representative_identity'
  | 'contact_reachable'
  | 'no_duplicate_tenant'
  | 'profile_completeness'
  | 'risk_accepted';

type Detail = {
  application: {
    id: string;
    status: string;
    officialName: string;
    displayName: string | null;
    website: string | null;
    country: string;
    location: string | null;
    address: string | null;
    denomination: string | null;
    yearEstablished: number | null;
    description: string | null;
    approxSize: string | null;
    branchCount: number | null;
    representativeName: string;
    representativeRole: string | null;
    email: string;
    phoneE164: string | null;
    preferredContact: string | null;
    emailVerifiedAt: string | null;
    assignedReviewerUserId: string | null;
    decisionNote: string | null;
    resultingChurchId: string | null;
    createdAt: string;
  };
  verification: {
    checks: Array<{ key: KycKey; state: KycState; note: string | null }>;
    reviewerNotes: string | null;
    complete: boolean;
    blockingIssues: string[];
    labels: Record<KycKey, { title: string; hint: string; step: number }>;
    completedAt: string | null;
  };
  hints: {
    suggestedSlug: string;
    slugAlreadyTaken: boolean;
    adminEmailAlreadyRegistered: boolean;
  };
  events: Array<{
    id: string;
    eventType: string;
    note: string | null;
    createdAt: string;
  }>;
  provisioning: {
    id: string;
    status: string;
    churchId: string | null;
    errorMessage: string | null;
    attemptCount: number;
  } | null;
};

const STEPS = [
  {
    id: 1,
    title: 'Intake',
    description: 'Email verification and reviewer assignment',
  },
  {
    id: 2,
    title: 'Church identity',
    description: 'Confirm the congregation profile',
  },
  {
    id: 3,
    title: 'Representative KYC',
    description: 'Confirm who is applying for the church',
  },
  {
    id: 4,
    title: 'Risk & completeness',
    description: 'Duplicates, completeness and residual risk',
  },
  {
    id: 5,
    title: 'Decision',
    description: 'Approve (provision) or reject',
  },
  {
    id: 6,
    title: 'Provisioning',
    description: 'Tenant creation and admin invite',
  },
] as const;

function Fact({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[18rem] text-right">{value ?? '—'}</dd>
    </div>
  );
}

export function GuidedVerifyClient({ applicationId }: { applicationId: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);
  const [checks, setChecks] = useState<
    Array<{ key: KycKey; state: KycState; note: string | null }>
  >([]);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [slug, setSlug] = useState('');
  const [locale, setLocale] = useState<'en' | 'sw'>('sw');
  const [timezone, setTimezone] = useState('Africa/Dar_es_Salaam');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi<Detail>(
        `/api/v1/platform/applications/${applicationId}`,
      );
      setData(res);
      setChecks(res.verification.checks);
      setReviewerNotes(res.verification.reviewerNotes ?? '');
      setSlug(res.hints.suggestedSlug);
      if (res.application.status === 'approved') setStep(6);
      else if (res.verification.complete) setStep(5);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useLoadEffect(load);

  const labels = data?.verification.labels;
  const stepChecks = useMemo(() => {
    if (!labels) return [];
    return checks.filter((c) => labels[c.key]?.step === step);
  }, [checks, labels, step]);

  function setCheckState(key: KycKey, state: KycState) {
    setChecks((prev) =>
      prev.map((c) => (c.key === key ? { ...c, state } : c)),
    );
  }

  function setCheckNote(key: KycKey, note: string) {
    setChecks((prev) =>
      prev.map((c) => (c.key === key ? { ...c, note } : c)),
    );
  }

  async function saveKyc() {
    setBusy(true);
    setError(null);
    try {
      const res = await platformApi<Detail>(
        `/api/v1/platform/applications/${applicationId}/kyc`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            checks: checks.map((c) => ({
              key: c.key,
              state: c.state,
              note: c.note,
            })),
            reviewerNotes: reviewerNotes.trim() || null,
          }),
        },
      );
      setData(res);
      setChecks(res.verification.checks);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function assign() {
    setBusy(true);
    setError(null);
    try {
      const res = await platformApi<Detail>(
        `/api/v1/platform/applications/${applicationId}/assign`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        },
      );
      setData(res);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: 'approve' | 'reject') {
    setBusy(true);
    setError(null);
    try {
      if (decision === 'approve') {
        await platformApi<Detail>(
          `/api/v1/platform/applications/${applicationId}/kyc`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              checks: checks.map((c) => ({
                key: c.key,
                state: c.state,
                note: c.note,
              })),
              reviewerNotes: reviewerNotes.trim() || null,
            }),
          },
        );
      }
      const body: Record<string, unknown> = { decision };
      if (decisionNote.trim()) body.note = decisionNote.trim();
      if (decision === 'approve') {
        if (slug.trim()) body.slug = slug.trim().toLowerCase();
        body.timezone = timezone;
        body.defaultLocale = locale;
      }
      const res = await platformApi<Detail>(
        `/api/v1/platform/applications/${applicationId}/decide`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      setData(res);
      setChecks(res.verification.checks);
      setStep(decision === 'approve' ? 6 : 5);
      if (decision === 'approve') {
        window.setTimeout(() => void load(), 1500);
      }
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function retryProvision() {
    const provId = data?.provisioning?.id;
    if (!provId) return;
    setBusy(true);
    setError(null);
    try {
      await platformApi(`/api/v1/platform/provisioning/${provId}/retry`, {
        method: 'POST',
      });
      window.setTimeout(() => void load(), 1500);
    } catch (err: unknown) {
      setError(humanizePlatformError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onContinue(e: FormEvent) {
    e.preventDefault();
    await saveKyc();
    setStep((s) => Math.min(6, s + 1));
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="h-48 rounded-card" />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon="church"
        tone="peach"
        title="Application not found"
        description={error ?? 'This application could not be loaded.'}
        action={
          <Link
            href="/platform/churches/applications"
            className={buttonClassName({ variant: 'secondary', size: 'sm' })}
          >
            Back to queue
          </Link>
        }
      />
    );
  }

  const app = data.application;
  const decided = app.status === 'approved' || app.status === 'rejected';

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <ConsoleHeader
        area="applications"
        tab="queue"
        title={app.officialName}
        description="Guided KYC and onboarding verification. Complete each step before approving."
        actions={
          <Badge
            tone={
              app.status === 'approved'
                ? 'sage'
                : app.status === 'rejected'
                  ? 'danger'
                  : 'sky'
            }
          >
            {app.status}
          </Badge>
        }
      />

      {error ? <p className="platform-error">{error}</p> : null}

      <nav
        aria-label="Verification steps"
        className="flex flex-wrap gap-2"
      >
        {STEPS.map((s) => {
          const active = step === s.id;
          const done =
            s.id < step ||
            (s.id <= 4 &&
              checks
                .filter((c) => data.verification.labels[c.key].step === s.id)
                .every((c) => c.state === 'pass' || c.state === 'na'));
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={
                active
                  ? 'rounded-xl border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] px-3 py-2 text-left text-sm'
                  : 'rounded-xl border border-border px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground'
              }
            >
              <span className="block font-semibold">
                {s.id}. {s.title}
                {done && !active ? ' ·' : ''}
              </span>
              <span className="mt-0.5 block text-xs opacity-80">
                {s.description}
              </span>
            </button>
          );
        })}
      </nav>

      {step === 1 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Intake">
            <dl>
              <Fact label="Submitted" value={new Date(app.createdAt).toLocaleString()} />
              <Fact
                label="Email verified"
                value={
                  app.emailVerifiedAt
                    ? new Date(app.emailVerifiedAt).toLocaleString()
                    : 'Not verified — cannot approve yet'
                }
              />
              <Fact
                label="Assigned reviewer"
                value={app.assignedReviewerUserId ?? 'Unassigned'}
              />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy || decided}
                onClick={() => void assign()}
              >
                Assign to me
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy || !app.emailVerifiedAt}
                onClick={(e) => void onContinue(e)}
              >
                Continue
              </Button>
            </div>
          </Panel>
          <Panel title="Email verification check">
            <ChecklistEditor
              checks={stepChecks}
              labels={data.verification.labels}
              disabled={decided || Boolean(app.emailVerifiedAt)}
              onState={setCheckState}
              onNote={setCheckNote}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              Email verification is set automatically when the applicant confirms
              their inbox.
            </p>
          </Panel>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Church profile">
            <dl>
              <Fact label="Official name" value={app.officialName} />
              <Fact label="Display name" value={app.displayName} />
              <Fact label="Denomination" value={app.denomination} />
              <Fact label="Year established" value={app.yearEstablished} />
              <Fact label="Approx size" value={app.approxSize} />
              <Fact label="Branches" value={app.branchCount} />
              <Fact
                label="Website"
                value={
                  app.website ? (
                    <a
                      href={app.website}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {app.website}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <Fact label="Country" value={app.country} />
              <Fact label="Location" value={app.location} />
              <Fact label="Address" value={app.address} />
            </dl>
            {app.description ? (
              <p className="mt-3 text-sm text-muted-foreground">{app.description}</p>
            ) : null}
          </Panel>
          <Panel title="Verify church identity">
            <form className="space-y-4" onSubmit={(e) => void onContinue(e)}>
              <ChecklistEditor
                checks={stepChecks}
                labels={data.verification.labels}
                disabled={decided}
                onState={setCheckState}
                onNote={setCheckNote}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button type="submit" size="sm" disabled={busy || decided}>
                  Save & continue
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Representative">
            <dl>
              <Fact label="Name" value={app.representativeName} />
              <Fact label="Role" value={app.representativeRole} />
              <Fact label="Email" value={app.email} />
              <Fact label="Phone" value={app.phoneE164} />
              <Fact label="Preferred contact" value={app.preferredContact} />
            </dl>
            {data.hints.adminEmailAlreadyRegistered ? (
              <p className="mt-3 rounded-xl border border-[color:var(--warning-soft)] bg-[color:var(--warning-soft)] px-3 py-2 text-sm">
                This email already has a user account — resolve before approving
                or the provision will fail.
              </p>
            ) : null}
          </Panel>
          <Panel title="Verify representative KYC">
            <form className="space-y-4" onSubmit={(e) => void onContinue(e)}>
              <ChecklistEditor
                checks={stepChecks}
                labels={data.verification.labels}
                disabled={decided}
                onState={setCheckState}
                onNote={setCheckNote}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button type="submit" size="sm" disabled={busy || decided}>
                  Save & continue
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Duplicate & risk hints">
            <dl>
              <Fact label="Suggested slug" value={data.hints.suggestedSlug} />
              <Fact
                label="Slug taken"
                value={data.hints.slugAlreadyTaken ? 'Yes — change slug' : 'No'}
              />
              <Fact
                label="Admin email taken"
                value={
                  data.hints.adminEmailAlreadyRegistered ? 'Yes' : 'No'
                }
              />
            </dl>
            <label className="mt-4 block text-sm">
              <span className="text-muted-foreground">Reviewer notes</span>
              <textarea
                className="platform-textarea mt-1"
                rows={4}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                disabled={decided}
                placeholder="Anything another operator should know…"
              />
            </label>
          </Panel>
          <Panel title="Completeness checklist">
            <form className="space-y-4" onSubmit={(e) => void onContinue(e)}>
              <ChecklistEditor
                checks={stepChecks}
                labels={data.verification.labels}
                disabled={decided}
                onState={setCheckState}
                onNote={setCheckNote}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setStep(3)}
                >
                  Back
                </Button>
                <Button type="submit" size="sm" disabled={busy || decided}>
                  Save & continue
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="KYC readiness">
            {data.verification.complete ? (
              <p className="text-sm text-[color:var(--sage-ink)]">
                All verification checks passed. You may approve.
              </p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {data.verification.blockingIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
            <label className="mt-4 block text-sm">
              <span className="text-muted-foreground">Decision note</span>
              <textarea
                className="platform-textarea mt-1"
                rows={3}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                disabled={decided}
              />
            </label>
          </Panel>
          <Panel title="Approve or reject">
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-muted-foreground">Slug</span>
                <input
                  className="platform-input mt-1"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={decided}
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Timezone</span>
                <input
                  className="platform-input mt-1"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={decided}
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Locale</span>
                <select
                  className="platform-select mt-1"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as 'en' | 'sw')}
                  disabled={decided}
                >
                  <option value="sw">sw</option>
                  <option value="en">en</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setStep(4)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    busy ||
                    decided ||
                    !data.verification.complete ||
                    !app.emailVerifiedAt
                  }
                  onClick={() => void decide('approve')}
                >
                  Approve & provision
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy || decided}
                  onClick={() => void decide('reject')}
                >
                  Reject
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      ) : null}

      {step === 6 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Provisioning">
            {!data.provisioning ? (
              <p className="text-sm text-muted-foreground">
                {app.status === 'approved'
                  ? 'Provisioning request not found yet — refresh shortly.'
                  : 'Approve the application to queue tenant provisioning.'}
              </p>
            ) : (
              <dl>
                <Fact label="Status" value={data.provisioning.status} />
                <Fact label="Attempts" value={data.provisioning.attemptCount} />
                <Fact
                  label="Error"
                  value={data.provisioning.errorMessage ?? '—'}
                />
                <Fact
                  label="Church"
                  value={
                    data.provisioning.churchId ? (
                      <Link
                        href={`/platform/churches/${data.provisioning.churchId}`}
                        className="hover:underline"
                      >
                        Open church
                      </Link>
                    ) : (
                      '—'
                    )
                  }
                />
              </dl>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void load()}
              >
                Refresh status
              </Button>
              {data.provisioning?.status === 'failed' ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void retryProvision()}
                >
                  Retry provision
                </Button>
              ) : null}
            </div>
          </Panel>
          <Panel title="Timeline">
            <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
              {data.events.map((ev) => (
                <li key={ev.id} className="border-b border-border pb-2">
                  <span className="font-medium">{ev.eventType}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(ev.createdAt).toLocaleString()}
                  </span>
                  {ev.note ? (
                    <p className="mt-1 text-muted-foreground">{ev.note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}

      <p>
        <Link
          href="/platform/churches/applications"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to applications
        </Link>
      </p>
    </div>
  );
}

function ChecklistEditor({
  checks,
  labels,
  disabled,
  onState,
  onNote,
}: {
  checks: Array<{ key: KycKey; state: KycState; note: string | null }>;
  labels: Record<KycKey, { title: string; hint: string; step: number }>;
  disabled?: boolean;
  onState: (key: KycKey, state: KycState) => void;
  onNote: (key: KycKey, note: string) => void;
}) {
  if (checks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No checks on this step.</p>
    );
  }
  return (
    <ul className="space-y-4">
      {checks.map((check) => {
        const meta = labels[check.key];
        return (
          <li key={check.key} className="rounded-xl border border-border p-3">
            <p className="font-medium text-sm">{meta.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{meta.hint}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['pass', 'fail', 'na', 'pending'] as const).map((state) => (
                <button
                  key={state}
                  type="button"
                  disabled={disabled}
                  onClick={() => onState(check.key, state)}
                  className={
                    check.state === state
                      ? 'rounded-md border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] px-2 py-1 text-xs font-semibold'
                      : 'rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground'
                  }
                >
                  {state}
                </button>
              ))}
            </div>
            <input
              className="platform-input mt-2"
              placeholder="Optional note"
              value={check.note ?? ''}
              disabled={disabled}
              onChange={(e) => onNote(check.key, e.target.value)}
            />
          </li>
        );
      })}
    </ul>
  );
}
