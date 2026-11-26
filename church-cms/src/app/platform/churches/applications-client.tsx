'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { Icon } from '@/app/_ekklesia/icons';
import { useLoadEffect } from '@/app/_ekklesia/session';
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
  buttonClassName,
} from '@/app/_ekklesia/ui';
import { humanizePlatformError, platformApi } from '../platform-api';

type ApplicationRow = {
  id: string;
  status: string;
  officialName: string;
  email: string;
  representativeName: string;
  emailVerifiedAt: string | null;
  assignedReviewerUserId: string | null;
  createdAt: string;
  resultingChurchId: string | null;
};

function statusTone(
  status: string,
): 'sage' | 'warning' | 'danger' | 'neutral' | 'sky' {
  if (status === 'approved') return 'sage';
  if (status === 'rejected' || status === 'withdrawn') return 'danger';
  if (status === 'under_review' || status === 'email_verified') return 'sky';
  if (status === 'submitted') return 'warning';
  return 'neutral';
}

export function ApplicationsClient() {
  const [items, setItems] = useState<ApplicationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('email_verified');
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(() => {
    const q = statusFilter
      ? `?status=${encodeURIComponent(statusFilter)}`
      : '';
    platformApi<{ items: ApplicationRow[] }>(
      `/api/v1/platform/applications${q}`,
    )
      .then((res) => {
        setItems(res.items);
        setLoadError(null);
      })
      .catch((err: unknown) => setLoadError(humanizePlatformError(err)));
  }, [statusFilter]);

  useLoadEffect(reload);

  return (
    <div className="flex flex-col gap-6">
      {loadError ? (
        <div className="platform-status platform-status-danger" role="alert">
          <span className="platform-status-icon">
            <Icon name="alert-circle" size={22} />
          </span>
          <div>
            <strong>Could not load applications</strong>
            <p>{loadError}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="text-muted-foreground">Status</span>
          <select
            className="platform-select mt-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="submitted">submitted</option>
            <option value="email_verified">email_verified</option>
            <option value="under_review">under_review</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
        </label>
        <Button type="button" variant="secondary" size="sm" onClick={reload}>
          Refresh
        </Button>
      </div>

      <Panel
        title="Queue"
        subtitle="Start guided KYC verification from an application row"
        flush
      >
        {items.length === 0 ? (
          <EmptyState
            icon="church"
            tone="sky"
            title="No applications in this filter"
            description="Public form: /register-church. Email-verified applications are ready for guided review."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Church</TH>
                  <TH>Representative</TH>
                  <TH>Status</TH>
                  <TH>Email verified</TH>
                  <TH>Submitted</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {items.map((row) => (
                  <TR key={row.id}>
                    <TD>
                      <div className="font-medium">{row.officialName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.email}
                      </div>
                    </TD>
                    <TD>{row.representativeName}</TD>
                    <TD>
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                    </TD>
                    <TD className="text-muted-foreground">
                      {row.emailVerifiedAt
                        ? new Date(row.emailVerifiedAt).toLocaleDateString()
                        : 'No'}
                    </TD>
                    <TD className="text-muted-foreground">
                      {new Date(row.createdAt).toLocaleString()}
                    </TD>
                    <TD>
                      <Link
                        href={`/platform/churches/applications/${row.id}`}
                        className={buttonClassName({
                          variant: 'primary',
                          size: 'sm',
                        })}
                      >
                        Guided verify
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
