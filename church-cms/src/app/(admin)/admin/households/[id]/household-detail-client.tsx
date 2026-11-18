'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { apiFetch, ApiError, useLoadEffect } from '@/app/_ekklesia/session';
import {
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
import type { Household, Person } from '../../../_lib/api-types';
import { titleCase } from '../../../_lib/format';
import { AddChildDialog } from './add-child-dialog';
import { AddMemberDialog } from './add-member-dialog';
import { EditHouseholdDialog } from './edit-household-dialog';
import { t } from '@/app/_ekklesia/i18n/core';

interface HouseholdDetailClientProps {
  householdId: string;
}

export function HouseholdDetailClient({
  householdId,
}: HouseholdDetailClientProps): React.ReactElement {
  const { push } = useToast();
  const [household, setHousehold] = useState<Household | null>(null);
  const [memberPeople, setMemberPeople] = useState<Record<string, Person>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Household>(
        `/api/v1/households/${householdId}`,
      );
      setHousehold(data);
      // Resolve people names for each member (best-effort, parallel).
      const peopleMap: Record<string, Person> = {};
      await Promise.all(
        data.members.map(async (m) => {
          try {
            const p = await apiFetch<Person>(`/api/v1/people/${m.personId}`);
            peopleMap[m.personId] = p;
          } catch {
            /* ignore — row will show the id */
          }
        }),
      );
      setMemberPeople(peopleMap);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('Unable to load this household.'),
      );
      setHousehold(null);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useLoadEffect(load);

  if (loading && !household) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton size="heading" className="w-64" />
        <Skeleton size="block" />
      </div>
    );
  }

  if (!household) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={
            <Link
              href="/admin/households"
              className="inline-flex items-center gap-1 text-foreground hover:text-[color:var(--brand-gold-ink)]"
            >
              <Icon name="arrow-left" size={14} />
              {t('Back to households')}
            </Link>
          }
          title={t('Household not found')}
          lede={error ?? t('This household may have been removed.')}
          actions={
            <Link
              href="/admin/households"
              className={buttonClassName({ variant: 'secondary' })}
            >
              {t('Back to list')}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={
          <Link
            href="/admin/households"
            className="inline-flex items-center gap-1 text-foreground hover:text-[color:var(--brand-gold-ink)]"
          >
            <Icon name="arrow-left" size={14} />
            {t('Back to households')}
          </Link>
        }
        title={t(household.label)}
        lede={household.sharedAddress ?? undefined}
        actions={
          <Button
            variant="secondary"
            iconLeft="edit"
            onClick={() => setEditOpen(true)}
          >
            {t('Edit')}
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('Emergency contact')}</CardTitle>
          </CardHeader>
          {household.emergencyContactName ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">
                {household.emergencyContactName}
              </p>
              {household.emergencyContactPhone ? (
                <p className="inline-flex items-center gap-2 text-muted-foreground">
                  <Icon name="phone" size={14} />
                  {household.emergencyContactPhone}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('No emergency contact on file.')}
            </p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('At a glance')}</CardTitle>
          </CardHeader>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('Members')}</span>
              <Badge tone="sage">{household.members.length}</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('Children')}</span>
              <Badge tone={household.children.length ? 'lavender' : 'neutral'}>
                {household.children.length}
              </Badge>
            </li>
          </ul>
        </Card>
      </div>

      <Panel
        title={t('Members')}
        subtitle={t('People linked to this household.')}
        flush
        actions={
          <Button
            size="sm"
            variant="secondary"
            iconLeft="plus"
            onClick={() => setMemberOpen(true)}
          >
            {t('Add member')}
          </Button>
        }
      >
        {household.members.length === 0 ? (
          <EmptyState
            icon="users"
            tone="sage"
            title={t('No members yet')}
            description={t('Link people from the directory to this household.')}
            action={
              <Button
                size="sm"
                iconLeft="plus"
                onClick={() => setMemberOpen(true)}
              >
                {t('Add member')}
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{t('Person')}</TH>
                  <TH>{t('Relationship')}</TH>
                  <TH>{t('Primary contact')}</TH>
                </TR>
              </THead>
              <TBody>
                {household.members.map((m) => {
                  const p = memberPeople[m.personId];
                  return (
                    <TR key={m.id}>
                      <TD>
                        {p ? (
                          <Link
                            href={`/admin/people/${p.id}`}
                            className="font-medium text-foreground hover:text-[color:var(--brand-gold-ink)] focus-ring rounded-sm"
                          >
                            {p.displayName}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {m.personId}
                          </span>
                        )}
                      </TD>
                      <TD>
                        <Badge tone="neutral">
                          {titleCase(m.relationship)}
                        </Badge>
                      </TD>
                      <TD>
                        {m.isPrimaryContact ? (
                          <StatusPill tone="success" hideDot>
                            {t('Primary')}
                          </StatusPill>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <Panel
        title={t('Children')}
        subtitle={t('Non-member children in this household.')}
        flush
        actions={
          <Button
            size="sm"
            variant="secondary"
            iconLeft="plus"
            onClick={() => setChildOpen(true)}
          >
            {t('Add child')}
          </Button>
        }
      >
        {household.children.length === 0 ? (
          <EmptyState
            icon="users"
            tone="lavender"
            title={t('No children on file')}
            description={t('Add children when you want ages for Sunday school and safeguarding records.')}
            action={
              <Button
                size="sm"
                iconLeft="plus"
                onClick={() => setChildOpen(true)}
              >
                {t('Add child')}
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{t('Name')}</TH>
                  <TH>{t('Age')}</TH>
                </TR>
              </THead>
              <TBody>
                {household.children.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium text-foreground">{c.name}</TD>
                    <TD>{c.age}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <EditHouseholdDialog
        open={editOpen}
        household={household}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setHousehold(updated);
          push({
            tone: 'success',
            title: t('Household updated'),
            message: t('{0} was saved.', updated.label),
          });
        }}
      />
      <AddMemberDialog
        open={memberOpen}
        householdId={household.id}
        onClose={() => setMemberOpen(false)}
        onSaved={(updated) => {
          setHousehold(updated);
          void load();
          push({
            tone: 'success',
            title: t('Member added'),
            message: t('The person is now linked to this household.'),
          });
        }}
      />
      <AddChildDialog
        open={childOpen}
        householdId={household.id}
        onClose={() => setChildOpen(false)}
        onSaved={(updated) => {
          setHousehold(updated);
          push({
            tone: 'success',
            title: t('Child added'),
            message: t('The child record is on file.'),
          });
        }}
      />
    </div>
  );
}
