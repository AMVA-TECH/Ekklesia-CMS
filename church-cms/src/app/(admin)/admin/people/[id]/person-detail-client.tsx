'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
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
import { t } from '@/app/_ekklesia/i18n/core';

interface PersonDetailClientProps {
  personId: string;
}

/**
 * Person profile page — live `/api/v1/people/:id` with identity edit,
 * directory toggle, and contact add against backend-supported mutations.
 */
export function PersonDetailClient({
  personId,
}: PersonDetailClientProps): React.ReactElement {
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
            : t('Unable to load this profile.'),
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
  }, [personId]);

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
        title: nextOptIn ? t('Added to directory') : t('Removed from directory'),
        message: t('{0} is now {1}.', updated.displayName, nextOptIn ? 'visible to members' : 'hidden from the directory'),
      });
    } catch (err) {
      push({
        tone: 'danger',
        title: t('Could not update'),
        message: err instanceof ApiError ? err.message : t('Please try again.'),
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
              {t('Back to people')}
            </Link>
          }
          title={t('Person not found')}
          lede={error ?? t('We couldn\'t find this record in the directory.')}
          actions={
            <Link href="/admin/people" className={buttonClassName({ variant: 'secondary' })}>
              {t('Back to list')}
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
            {t('Back to people')}
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
              {t('Edit')}
            </Button>
            <Button
              variant="secondary"
              iconLeft={person.directoryOptIn ? 'eye-off' : 'eye'}
              onClick={() => {
                void handleToggleDirectory();
              }}
            >
              {person.directoryOptIn ? t('Hide from directory') : t('Show in directory')}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('Identity')}</CardTitle>
            <Badge tone="neutral">{person.preferredLocale.toUpperCase()}</Badge>
          </CardHeader>
          <dl className="space-y-3 text-sm">
            <Row label={t('Display name')} value={person.displayName} />
            <Row label={t('Full name')} value={person.fullName ?? '—'} />
            <Row
              label={t('Date of birth')}
              value={person.dateOfBirth ? formatDate(person.dateOfBirth) : '—'}
            />
            <Row label={t('Added')} value={formatDate(person.createdAt)} />
            <Row
              label={t('Directory')}
              value={
                person.directoryOptIn ? (
                  <StatusPill tone="success" hideDot>
                    {t('Opted in')}
                  </StatusPill>
                ) : (
                  <span className="text-muted-foreground">{t('Private')}</span>
                )
              }
            />
          </dl>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Primary contact')}</CardTitle>
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
                  ? t('Only contact on file.')
                  : t('+{0} more on record.', person.contacts.length - 1)}
              </p>
            </div>
          ) : (
            <EmptyState
              icon="phone"
              tone="sky"
              title={t('No contact yet')}
              description={t('Add a phone or email so your team can reach this person.')}
              action={
                <Button
                  size="sm"
                  iconLeft="plus"
                  onClick={() => setContactOpen(true)}
                >
                  {t('Add contact')}
                </Button>
              }
            />
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Memberships')}</CardTitle>
            <Badge tone="neutral">{memberships.length}</Badge>
          </CardHeader>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('Not currently linked to any membership record.')}
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
                      {titleCase(m.membershipType)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('From')} {formatDate(m.effectiveFrom)}
                      {m.effectiveTo ? (' ' + t('· to {0}', formatDate(m.effectiveTo))) : ''}
                    </p>
                  </div>
                  <StatusPill tone={membershipStatusTone(m.status)}>
                    {titleCase(m.status)}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Panel
        title={t('All contact channels')}
        subtitle={t('Primary channel shown first.')}
        flush
        actions={
          <Button
            size="sm"
            variant="secondary"
            iconLeft="plus"
            onClick={() => setContactOpen(true)}
          >
            {t('Add contact')}
          </Button>
        }
      >
        {person.contacts.length === 0 ? (
          <EmptyState
            icon="mail"
            tone="neutral"
            title={t('No channels on file')}
            description={t('Contact channels appear here once added to this person.')}
            action={
              <Button
                size="sm"
                iconLeft="plus"
                onClick={() => setContactOpen(true)}
              >
                {t('Add contact')}
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{t('Channel')}</TH>
                  <TH>{t('Value')}</TH>
                  <TH>{t('Primary')}</TH>
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
                            {t('Primary')}
                          </StatusPill>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
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
            title: t('Person updated'),
            message: t('{0}\'s details were saved.', updated.displayName),
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
            title: t('Contact added'),
            message: t('The new channel is on file.'),
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
        {t(label)}
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
