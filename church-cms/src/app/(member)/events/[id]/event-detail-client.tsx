'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch, useSession } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  Card,
  CardSubtitle,
  CardTitle,
  Dialog,
  DialogFooter,
  EmptyState,
  PageHeader,
  Skeleton,
  StatusPill,
  useToast,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type { MemberEvent } from '../../_shared/api-types';
import {
  formatEventTime,
  formatLongDate,
  formatRelativeToToday,
} from '../../_shared/formatters';

interface MemberRegistration {
  id: string;
  eventId: string;
  personId: string;
  status: string;
  createdAt: string;
}

type RegistrationState =
  | { kind: 'unknown' }
  | { kind: 'none' }
  | { kind: 'registered'; registration: MemberRegistration }
  | { kind: 'cancelled'; registration: MemberRegistration };

export function EventDetailClient({ eventId }: { eventId: string }): React.ReactElement {
  const router = useRouter();
  const { user } = useSession();
  const { push } = useToast();
  const [event, setEvent] = useState<MemberEvent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<RegistrationState>({ kind: 'unknown' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [eventResult, registrationsResult] = await Promise.allSettled([
          apiFetch<MemberEvent>(`/api/v1/events/${eventId}`),
          apiFetch<MemberRegistration[]>(
            `/api/v1/events/${eventId}/registrations`,
          ),
        ]);
        if (cancelled) return;

        if (eventResult.status === 'fulfilled') {
          setEvent(eventResult.value);
        } else {
          const reason = eventResult.reason;
          if (reason instanceof ApiError && reason.status === 404) {
            setLoadError('This event is not available.');
          } else if (reason instanceof ApiError) {
            setLoadError(reason.message);
          } else {
            setLoadError('We could not load this event.');
          }
          return;
        }

        if (registrationsResult.status === 'fulfilled') {
          const mine = user?.id
            ? registrationsResult.value.find(
                (r) => r.personId === user.id || r.status === 'registered',
              )
            : undefined;
          const activeMine = registrationsResult.value.find(
            (r) => r.status === 'registered',
          );
          const chosen = mine ?? activeMine;
          if (!chosen) {
            setRegistration({ kind: 'none' });
          } else if (chosen.status === 'registered') {
            setRegistration({ kind: 'registered', registration: chosen });
          } else {
            setRegistration({ kind: 'cancelled', registration: chosen });
          }
        } else {
          // Registrations list may be forbidden for pure members on some backends;
          // treat as unknown so the user can still try to register.
          setRegistration({ kind: 'none' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, user?.id]);

  const handleRegister = useCallback(async () => {
    setSubmitting(true);
    try {
      const created = await apiFetch<MemberRegistration>(
        `/api/v1/events/${eventId}/registrations`,
        { method: 'POST', json: {} },
      );
      setRegistration({ kind: 'registered', registration: created });
      push({ tone: 'success', title: 'You’re in!', message: 'We saved your spot.' });
    } catch (e) {
      if (e instanceof ApiError) {
        push({
          tone: 'danger',
          title: 'We couldn’t register you',
          message: e.message || 'Try again in a moment.',
        });
      } else {
        push({ tone: 'danger', message: 'Check your connection and try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  }, [eventId, push]);

  const handleCancel = useCallback(async () => {
    setSubmitting(true);
    try {
      await apiFetch(`/api/v1/events/${eventId}/registrations/me`, {
        method: 'DELETE',
      });
      setRegistration((prev) =>
        prev.kind === 'registered'
          ? { kind: 'cancelled', registration: prev.registration }
          : { kind: 'none' },
      );
      push({
        tone: 'neutral',
        message: 'Your spot has been cancelled. You can register again later.',
      });
    } catch (e) {
      if (e instanceof ApiError) {
        push({
          tone: 'danger',
          title: 'We couldn’t cancel',
          message: e.message || 'Try again in a moment.',
        });
      } else {
        push({ tone: 'danger', message: 'Check your connection and try again.' });
      }
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }, [eventId, push]);

  if (loading) {
    return <EventDetailSkeleton />;
  }

  if (loadError || !event) {
    return (
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          iconLeft="arrow-left"
          onClick={() => router.push('/events')}
        >
          Back to events
        </Button>
        <EmptyState
          icon="calendar"
          tone="sky"
          title="Event not found"
          description={loadError ?? 'We could not find that event.'}
          action={
            <Link
              href="/events"
              className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-2 hover:underline focus-ring rounded-sm"
            >
              Browse all events
            </Link>
          }
        />
      </div>
    );
  }

  const startTime = formatEventTime(event.startsAt);
  const endTime = formatEventTime(event.endsAt);
  const isCancelled = event.status === 'cancelled';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          iconLeft="arrow-left"
          size="sm"
          onClick={() => router.push('/events')}
        >
          Back to events
        </Button>
      </div>

      {event.posterUrl ? (
        <div className="overflow-hidden rounded-card border border-border bg-surface-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.posterUrl}
            alt=""
            className="h-auto w-full"
            loading="eager"
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="flex aspect-[16/9] w-full items-center justify-center rounded-card border border-border tone-sky"
        >
          <Icon name="calendar" size={56} />
        </div>
      )}

      <PageHeader
        eyebrow={event.eventTypeName ?? 'Church gathering'}
        title={event.title}
        lede={event.description ?? undefined}
      />

      <Card padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md tone-sky"
          >
            <Icon name="calendar" size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {formatLongDate(event.serviceDate)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeToToday(event.serviceDate)}
              {startTime ? ` · ${startTime}` : null}
              {endTime ? ` – ${endTime}` : null}
            </p>
          </div>
        </div>
        {isCancelled ? <StatusPill tone="danger">Cancelled</StatusPill> : null}
      </Card>

      <section aria-labelledby="event-registration">
        <h2 id="event-registration" className="sr-only">
          Your attendance
        </h2>
        <Card padding="lg" className="flex flex-col gap-4">
          {isCancelled ? (
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[color:var(--danger-soft)] text-[color:var(--danger-ink)]"
              >
                <Icon name="alert" size={18} />
              </span>
              <div>
                <CardTitle>This event has been cancelled</CardTitle>
                <CardSubtitle>
                  Please contact your church office if you have questions.
                </CardSubtitle>
              </div>
            </div>
          ) : registration.kind === 'registered' ? (
            <>
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[color:var(--success-soft)] text-[color:var(--success-ink)]"
                >
                  <Icon name="check-circle" size={20} />
                </span>
                <div>
                  <CardTitle>You&rsquo;re registered</CardTitle>
                  <CardSubtitle>
                    We&rsquo;re looking forward to seeing you.
                  </CardSubtitle>
                </div>
              </div>
              <div>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmOpen(true)}
                  loading={submitting}
                >
                  Cancel my spot
                </Button>
              </div>
            </>
          ) : registration.kind === 'cancelled' ? (
            <>
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md tone-peach"
                >
                  <Icon name="refresh" size={18} />
                </span>
                <div>
                  <CardTitle>Changed your mind?</CardTitle>
                  <CardSubtitle>
                    Your previous registration was cancelled — you can sign up again.
                  </CardSubtitle>
                </div>
              </div>
              <div>
                <Button onClick={() => void handleRegister()} loading={submitting}>
                  Register again
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md tone-gold"
                >
                  <Icon name="hand" size={20} />
                </span>
                <div>
                  <CardTitle>Save your spot</CardTitle>
                  <CardSubtitle>
                    Let your church know you&rsquo;re planning to come.
                  </CardSubtitle>
                </div>
              </div>
              <div>
                <Button onClick={() => void handleRegister()} loading={submitting}>
                  Register for this event
                </Button>
              </div>
            </>
          )}
        </Card>
      </section>

      {event.description ? (
        <section aria-labelledby="event-about">
          <h2
            id="event-about"
            className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          >
            About this event
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {event.description}
          </p>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {event.eventTypeName ? (
          <Badge tone="sky">{event.eventTypeName}</Badge>
        ) : null}
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Cancel your spot?"
        description="You can register again later as long as there's still room."
        footer={
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Keep my spot
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleCancel()}
              loading={submitting}
            >
              Yes, cancel
            </Button>
          </DialogFooter>
        }
      >
        <p className="text-sm text-muted-foreground">
          We&rsquo;ll let your church know you&apos;re no longer planning to come.
        </p>
      </Dialog>
    </div>
  );
}

function EventDetailSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton size="block" className="aspect-[16/9] w-full" radius="md" />
      <Skeleton size="heading" className="w-2/3" />
      <Skeleton size="line" />
      <Skeleton size="line" className="w-1/2" />
      <Skeleton size="block" className="h-28 w-full" radius="md" />
    </div>
  );
}
