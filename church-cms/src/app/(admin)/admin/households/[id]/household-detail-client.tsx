'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
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

interface HouseholdDetailClientProps {
  householdId: string;
}

export function HouseholdDetailClient({
  householdId,
}: HouseholdDetailClientProps): React.ReactElement {
  const th = useTranslations('AdminHouseholds');
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
            : th('unableLoadHousehold'),
      );
      setHousehold(null);
    } finally {
      setLoading(false);
    }
  }, [householdId, th]);

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
              {th('backToHouseholds')}
            </Link>
          }
          title={th('householdNotFound')}
          lede={error ?? th('householdNotFoundLede')}
          actions={
            <Link
              href="/admin/households"
              className={buttonClassName({ variant: 'secondary' })}
            >
              {th('backToList')}
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
            {th('backToHouseholds')}
          </Link>
        }
        title={household.label}
        lede={household.sharedAddress ?? undefined}
        actions={
          <Button
            variant="secondary"
            iconLeft="edit"
            onClick={() => setEditOpen(true)}
          >
            {th('edit')}
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{th('emergencyContact')}</CardTitle>
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
              {th('noEmergencyContact')}
            </p>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{th('atAGlance')}</CardTitle>
          </CardHeader>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">{th('members')}</span>
              <Badge tone="sage">{household.members.length}</Badge>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">{th('children')}</span>
              <Badge tone={household.children.length ? 'lavender' : 'neutral'}>
                {household.children.length}
              </Badge>
            </li>
          </ul>
        </Card>
      </div>

      <Panel
        title={th('members')}
        subtitle={th('membersSubtitle')}
        flush
        actions={
          <Button
            size="sm"
            variant="secondary"
            iconLeft="plus"
            onClick={() => setMemberOpen(true)}
          >
            {th('addMember')}
          </Button>
        }
      >
        {household.members.length === 0 ? (
          <EmptyState
            icon="users"
            tone="sage"
            title={th('noMembersYet')}
            description={th('noMembersYetDesc')}
            action={
              <Button
                size="sm"
                iconLeft="plus"
                onClick={() => setMemberOpen(true)}
              >
                {th('addMember')}
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{th('colPerson')}</TH>
                  <TH>{th('colRelationship')}</TH>
                  <TH>{th('colPrimaryContact')}</TH>
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
                            {th('primary')}
                          </StatusPill>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {th('dash')}
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
        title={th('children')}
        subtitle={th('childrenSubtitle')}
        flush
        actions={
          <Button
            size="sm"
            variant="secondary"
            iconLeft="plus"
            onClick={() => setChildOpen(true)}
          >
            {th('addChild')}
          </Button>
        }
      >
        {household.children.length === 0 ? (
          <EmptyState
            icon="users"
            tone="lavender"
            title={th('noChildren')}
            description={th('noChildrenDesc')}
            action={
              <Button
                size="sm"
                iconLeft="plus"
                onClick={() => setChildOpen(true)}
              >
                {th('addChild')}
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{th('colName')}</TH>
                  <TH>{th('colAge')}</TH>
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
            title: th('householdUpdated'),
            message: th('householdUpdatedMessage', { label: updated.label }),
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
            title: th('memberAdded'),
            message: th('memberAddedMessage'),
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
            title: th('childAdded'),
            message: th('childAddedMessage'),
          });
        }}
      />
    </div>
  );
}
