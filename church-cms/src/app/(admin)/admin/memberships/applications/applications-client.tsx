'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
import { formatDate } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import { usePeopleNames } from '../../../_lib/use-people-names';

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
  const t = useTranslations('AdminPages');
  const tm = useTranslations('AdminMemberships');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('pending');
  const list = useApiList<MembershipApplication>(
    `/api/v1/membership-applications?status=${status}&limit=100`,
  );
  const names = usePeopleNames(list.items.map((a) => a.personId));
  const { busyKey, run } = useRowAction();
  const [rejecting, setRejecting] = useState<MembershipApplication | null>(null);

  const statusLabel = (value: (typeof STATUSES)[number]): string => {
    switch (value) {
      case 'pending':
        return tm('statusPending');
      case 'approved':
        return tm('statusApproved');
      case 'rejected':
        return tm('statusRejected');
      case 'withdrawn':
        return tm('statusWithdrawn');
      default:
        return value;
    }
  };

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
        eyebrow={<Link href="/admin/memberships">{t('memberships')}</Link>}
        title={t('membershipApplications')}
        lede={t('membershipApplicationsLede')}
      />

      <Tabs
        value={status}
        onValueChange={(v) => setStatus(v as (typeof STATUSES)[number])}
      >
        <TabList aria-label={tm('applicationStatusAria')}>
          {STATUSES.map((s) => (
            <Tab key={s} value={s}>
              {statusLabel(s)}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={tm('applicationsTitle', { status: statusLabel(status) })}
        subtitle={
          list.loading
            ? tm('loadingEllipsis')
            : tm('shownCount', { count: list.items.length })
        }
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
                ? tm('noAppsWaiting')
                : tm('noAppsStatus', { status: statusLabel(status).toLowerCase() }),
            description:
              status === 'pending'
                ? tm('noAppsWaitingDesc')
                : undefined,
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tm('colApplicant')}</TH>
                  <TH>{tm('colSubmitted')}</TH>
                  <TH>{tm('colStatus')}</TH>
                  {status === 'pending' ? <TH className="text-right">{tm('colDecision')}</TH> : null}
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
                        {names[app.personId] ?? tm('loadingEllipsis')}
                      </Link>
                    </TD>
                    <TD className="text-sm text-muted-foreground">
                      {formatDate(app.createdAt)}
                    </TD>
                    <TD>
                      <StatusPill tone={TONE[app.status]}>
                        {statusLabel(app.status)}
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
                              const name = names[app.personId];
                              const ok = await run(
                                app.id,
                                () => decide(app, 'approved'),
                                {
                                  success: tm('applicationApproved'),
                                  detail: name
                                    ? tm('applicationApprovedDetail', { name })
                                    : tm('applicationApprovedDetailFallback'),
                                  failure: tm('couldNotApprove'),
                                },
                              );
                              if (ok) void list.reload();
                            }}
                          >
                            {tm('approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyKey !== null}
                            onClick={() => setRejecting(app)}
                          >
                            {tm('reject')}
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
          applicantName={names[rejecting.personId] ?? tm('thisApplicant')}
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
  const tm = useTranslations('AdminMemberships');
  const [reason, setReason] = useState('');
  return (
    <FormDialog
      title={tm('rejectTitle')}
      description={tm('rejectDesc', { name: applicantName })}
      submitLabel={tm('rejectSubmit')}
      submitVariant="destructive"
      size="sm"
      onClose={onClose}
      onSubmit={() => onReject(reason.trim() || undefined)}
    >
      {(errors) => (
        <Field
          label={tm('reason')}
          hint={tm('reasonHint')}
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
