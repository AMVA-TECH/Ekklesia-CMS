'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
import {
  Avatar,
  Badge,
  Button,
  buttonClassName,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
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
  useToast,
} from '@/app/_ekklesia/ui';
import { Icon } from '@/app/_ekklesia/icons';
import type { Membership, Person } from '../../../_lib/api-types';
import { formatDate, titleCase } from '../../../_lib/format';
import { asList } from '../../../_lib/list';
import { AddContactDialog } from './add-contact-dialog';
import { EditPersonDialog } from './edit-person-dialog';

interface PersonDetailClientProps {
  personId: string;
}

/**
 * Person profile page — live `/api/v1/people/:id` with identity edit,
 * directory toggle, and contact add against backend-supported mutations.
 */
function membershipTypeLabel(
  value: string,
  tm: (key: string) => string,
): string {
  switch (value) {
    case 'individual':
      return tm('typeIndividual');
    case 'household':
      return tm('typeHousehold');
    case 'family':
      return tm('typeFamily');
    default:
      return titleCase(value);
  }
}

function membershipStatusLabel(
  value: string,
  tm: (key: string) => string,
): string {
  switch (value) {
    case 'visitor':
      return tm('statusVisitor');
    case 'active':
      return tm('statusActive');
    case 'inactive':
      return tm('statusInactive');
    default:
      return titleCase(value);
  }
}

export function PersonDetailClient({
  personId,
}: PersonDetailClientProps): React.ReactElement {
  const tp = useTranslations('AdminPeople');
  const tm = useTranslations('AdminMemberships');
  const { push } = useToast();
  const [person, setPerson] = useState<Person | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Person>(`/api/v1/people/${personId}`);
      setPerson(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : tp('unableLoadProfile'),
      );
      setPerson(null);
    } finally {
      setLoading(false);
    }

    // Memberships are optional context; failures are shown inline, not fatal.
    try {
      const payload = await apiFetch<
        Membership[] | { data: Membership[] }
      >('/api/v1/memberships?limit=100');
      setMemberships(
        asList(payload).filter((m) => m.personId === personId),
      );
    } catch {
      setMemberships([]);
    }
  }, [personId, tp]);

  useLoadEffect(load);

  const handleToggleDirectory = async (): Promise<void> => {
    if (!person) return;
    const nextOptIn = !person.directoryOptIn;
    try {
      const updated = await apiFetch<Person>(`/api/v1/people/${person.id}`, {
        method: 'PATCH',
        json: { directoryOptIn: nextOptIn },
      });
      setPerson(updated);
      push({
        tone: 'success',
        title: nextOptIn ? tp('addedToDirectory') : tp('removedFromDirectory'),
        message: nextOptIn
          ? tp('nowVisible', { name: updated.displayName })
          : tp('nowHidden', { name: updated.displayName }),
      });
    } catch (err) {
      push({
        tone: 'danger',
        title: tp('couldNotUpdate'),
        message: err instanceof ApiError ? err.message : tp('pleaseTryAgain'),
      });
    }
  };

  if (loading && !person) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton size="heading" className="w-64" />
        <Skeleton size="block" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={
            <Link
              href="/admin/people"
              className="inline-flex items-center gap-1 text-foreground hover:text-[color:var(--brand-gold-ink)]"
            >
              <Icon name="arrow-left" size={14} />
              {tp('backToPeople')}
            </Link>
          }
          title={tp('personNotFound')}
          lede={error ?? tp('personNotFoundLede')}
          actions={
            <Link href="/admin/people" className={buttonClassName({ variant: 'secondary' })}>
              {tp('backToList')}
            </Link>
          }
        />
      </div>
    );
  }

  const primaryContact =
    person.contacts.find((c) => c.isPrimary) ?? person.contacts[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link
            href="/admin/people"
            className="inline-flex items-center gap-1 text-foreground hover:text-[color:var(--brand-gold-ink)]"
          >
            <Icon name="arrow-left" size={14} />
            {tp('backToPeople')}
          </Link>
        }
        title={
          <span className="inline-flex items-center gap-3">
            <Avatar name={person.displayName} size="lg" />
            <span>{person.displayName}</span>
          </span>
        }
        lede={person.fullName ?? undefined}
        actions={
          <>
            <Button
              variant="secondary"
              iconLeft="edit"
              onClick={() => setEditOpen(true)}
            >
              {tp('edit')}
            </Button>
            <Button
              variant="secondary"
              iconLeft={person.directoryOptIn ? 'eye-off' : 'eye'}
              onClick={() => {
                void handleToggleDirectory();
              }}
            >
              {person.directoryOptIn ? tp('hideFromDirectory') : tp('showInDirectoryBtn')}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{tp('identity')}</CardTitle>
            <Badge tone="neutral">{person.preferredLocale.toUpperCase()}</Badge>
          </CardHeader>
          <dl className="space-y-3 text-sm">
            <Row label={tp('displayName')} value={person.displayName} />
            <Row label={tp('fullName')} value={person.fullName ?? tp('dash')} />
            <Row
              label={tp('dateOfBirth')}
              value={person.dateOfBirth ? formatDate(person.dateOfBirth) : tp('dash')}
            />
            <Row label={tp('added')} value={formatDate(person.createdAt)} />
            <Row
              label={tp('colDirectory')}
              value={
                person.directoryOptIn ? (
                  <StatusPill tone="success" hideDot>
                    {tp('optedIn')}
                  </StatusPill>
                ) : (
                  <span className="text-muted-foreground">{tp('private')}</span>
                )
              }
            />
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tp('primaryContact')}</CardTitle>
          </CardHeader>
          {primaryContact ? (
            <div className="space-y-3 text-sm">
              <p className="inline-flex items-center gap-2 font-medium text-foreground">
                <Icon
                  name={primaryContact.channel === 'email' ? 'mail' : 'phone'}
                  size={16}
                  className="text-muted-foreground"
                />
                {primaryContact.value}
              </p>
              <p className="text-xs text-muted-foreground">
                {person.contacts.length === 1
                  ? tp('onlyContact')
                  : tp('moreContacts', { count: person.contacts.length - 1 })}
              </p>
            </div>
          ) : (
            <EmptyState
              icon="phone"
              tone="sky"
              title={tp('noContactYet')}
              description={tp('noContactYetDesc')}
              action={
                <Button
                  size="sm"
                  iconLeft="plus"
                  onClick={() => setContactOpen(true)}
                >
                  {tp('addContact')}
                </Button>
              }
            />
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tp('memberships')}</CardTitle>
            <Badge tone="neutral">{memberships.length}</Badge>
          </CardHeader>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {tp('noMemberships')}
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {memberships.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-muted/40 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {membershipTypeLabel(m.membershipType, tm)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.effectiveTo
                        ? tp('membershipFromTo', {
                            start: formatDate(m.effectiveFrom),
                            end: formatDate(m.effectiveTo),
                          })
                        : tp('membershipFrom', {
                            start: formatDate(m.effectiveFrom),
                          })}
                    </p>
                  </div>
                  <StatusPill tone={membershipStatusTone(m.status)}>
                    {membershipStatusLabel(m.status, tm)}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Panel
        title={tp('allContactChannels')}
        subtitle={tp('allContactChannelsSubtitle')}
        flush
        actions={
          <Button
            size="sm"
            variant="secondary"
            iconLeft="plus"
            onClick={() => setContactOpen(true)}
          >
            {tp('addContact')}
          </Button>
        }
      >
        {person.contacts.length === 0 ? (
          <EmptyState
            icon="mail"
            tone="neutral"
            title={tp('noChannels')}
            description={tp('noChannelsDesc')}
            action={
              <Button
                size="sm"
                iconLeft="plus"
                onClick={() => setContactOpen(true)}
              >
                {tp('addContact')}
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tp('colChannel')}</TH>
                  <TH>{tp('colValue')}</TH>
                  <TH>{tp('colPrimary')}</TH>
                </TR>
              </THead>
              <TBody>
                {[...person.contacts]
                  .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
                  .map((c) => (
                    <TR key={c.id}>
                      <TD>
                        <span className="inline-flex items-center gap-2">
                          <Icon
                            name={c.channel === 'email' ? 'mail' : 'phone'}
                            size={14}
                            className="text-muted-foreground"
                          />
                          {titleCase(c.channel)}
                        </span>
                      </TD>
                      <TD>{c.value}</TD>
                      <TD>
                        {c.isPrimary ? (
                          <StatusPill tone="success" hideDot>
                            {tp('primary')}
                          </StatusPill>
                        ) : (
                          <span className="text-xs text-muted-foreground">{tp('dash')}</span>
                        )}
                      </TD>
                    </TR>
                  ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <EditPersonDialog
        open={editOpen}
        person={person}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setPerson(updated);
          push({
            tone: 'success',
            title: tp('personUpdated'),
            message: tp('personUpdatedMessage', { name: updated.displayName }),
          });
        }}
      />
      <AddContactDialog
        open={contactOpen}
        personId={person.id}
        onClose={() => setContactOpen(false)}
        onSaved={(updated) => {
          setPerson(updated);
          push({
            tone: 'success',
            title: tp('contactAdded'),
            message: tp('contactAddedMessage'),
          });
        }}
      />
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-right text-sm text-foreground">{value}</dd>
    </div>
  );
}

function membershipStatusTone(
  status: string,
): 'neutral' | 'success' | 'warning' | 'info' | 'pending' {
  switch (status) {
    case 'member':
    case 'leader':
      return 'success';
    case 'visitor':
      return 'info';
    case 'inactive':
      return 'neutral';
    default:
      return 'pending';
  }
}
