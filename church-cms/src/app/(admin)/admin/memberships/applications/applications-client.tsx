'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '@/app/_ekklesia/session';
import {
  Button,
  Field,
  PageHeader,
  Panel,
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
import { FormDialog, ListState, useRowAction } from '../../../_components/kit';
import { formatDate, titleCase } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import { usePeopleNames } from '../../../_lib/use-people-names';
import { t } from '@/app/_ekklesia/i18n/core';

interface MembershipApplication {
  id: string;
  personId: string;
  householdId: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  createdAt: string;
}

const STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'] as const;

const TONE = {
  pending: 'pending',
  approved: 'success',
  rejected: 'danger',
  withdrawn: 'neutral',
} as const;

export function ApplicationsClient(): React.ReactElement {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('pending');
  const list = useApiList<MembershipApplication>(
    `/api/v1/membership-applications?status=${status}&limit=100`,
  );
  const names = usePeopleNames(list.items.map((a) => a.personId));
  const { busyKey, run } = useRowAction();
  const [rejecting, setRejecting] = useState<MembershipApplication | null>(null);

  const decide = async (
    app: MembershipApplication,
    outcome: 'approved' | 'rejected',
    reason?: string,
  ): Promise<void> => {
    await apiFetch(`/api/v1/membership-applications/${app.id}/decision`, {
      method: 'POST',
      json: { outcome, ...(reason ? { reason } : {}) },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/admin/memberships">{t('Memberships')}</Link>}
        title={t('Membership applications')}
        lede={t('People asking to become members. Approving activates their membership; rejecting keeps them as a visitor.')}
      />

      <Tabs
        value={status}
        onValueChange={(v) => setStatus(v as (typeof STATUSES)[number])}
      >
        <TabList aria-label={t('Application status')}>
          {STATUSES.map((s) => (
            <Tab key={s} value={s}>
              {titleCase(s)}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={t('{0} applications', titleCase(status))}
        subtitle={list.loading ? t('Loading…') : t('{0} shown', list.items.length)}
        flush
      >
        <ListState
          loading={list.loading}
          error={list.error}
          forbidden={list.forbidden}
          isEmpty={list.items.length === 0}
          onRetry={() => void list.reload()}
          empty={{
            icon: 'user-plus',
            title:
              status === 'pending'
                ? t('No applications waiting')
                : t('No {0} applications', titleCase(status).toLowerCase()),
            description:
              status === 'pending'
                ? t('New requests to join will appear here for pastoral and admin review.')
                : undefined,
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{t('Applicant')}</TH>
                  <TH>{t('Submitted')}</TH>
                  <TH>{t('Status')}</TH>
                  {status === 'pending' ? <TH className="text-right">{t('Decision')}</TH> : null}
                </TR>
              </THead>
              <TBody>
                {list.items.map((app) => (
                  <TR key={app.id}>
                    <TD className="font-medium text-foreground">
                      <Link
                        href={`/admin/people/${app.personId}`}
                        className="hover:underline"
                      >
                        {names[app.personId] ?? t('Loading…')}
                      </Link>
                    </TD>
                    <TD className="text-sm text-muted-foreground">
                      {formatDate(app.createdAt)}
                    </TD>
                    <TD>
                      <StatusPill tone={TONE[app.status]}>
                        {titleCase(app.status)}
                      </StatusPill>
                    </TD>
                    {status === 'pending' ? (
                      <TD className="text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            iconLeft="check"
                            loading={busyKey === app.id}
                            disabled={busyKey !== null}
                            onClick={async () => {
                              const ok = await run(
                                app.id,
                                () => decide(app, 'approved'),
                                {
                                  success: t('Application approved'),
                                  detail: t('{0} are now an active member.', names[app.personId] ?? 'They'),
                                  failure: t('Could not approve'),
                                },
                              );
                              if (ok) void list.reload();
                            }}
                          >
                            {t('Approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyKey !== null}
                            onClick={() => setRejecting(app)}
                          >
                            {t('Reject')}
                          </Button>
                        </div>
                      </TD>
                    ) : null}
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </ListState>
      </Panel>

      {rejecting ? (
        <RejectDialog
          applicantName={names[rejecting.personId] ?? 'this applicant'}
          onClose={() => setRejecting(null)}
          onReject={async (reason) => {
            await decide(rejecting, 'rejected', reason);
            setRejecting(null);
            void list.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function RejectDialog({
  applicantName,
  onClose,
  onReject,
}: {
  applicantName: string;
  onClose: () => void;
  onReject: (reason: string | undefined) => Promise<void>;
}): React.ReactElement {
  const [reason, setReason] = useState('');
  return (
    <FormDialog
      title={t('Reject application')}
      description={t('{0} will stay on record as a visitor.', applicantName)}
      submitLabel={t('Reject application')}
      submitVariant="destructive"
      size="sm"
      onClose={onClose}
      onSubmit={() => onReject(reason.trim() || undefined)}
    >
      {(errors) => (
        <Field
          label={t('Reason')}
          hint={t('Optional. Kept in the audit log, not sent to the applicant.')}
          error={errors.reason}
        >
          <Textarea
            data-autofocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </Field>
      )}
    </FormDialog>
  );
}
