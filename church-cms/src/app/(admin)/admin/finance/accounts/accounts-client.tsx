'use client';

import { useMemo, useState } from 'react';
import { apiFetch } from '@/app/_ekklesia/session';
import {
  Button,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  StatusPill,
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/app/_ekklesia/ui';
import { FormDialog, ListState, useRowAction } from '../../../_components/kit';
import { formatDate, titleCase } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import {
  ACCOUNT_TYPES,
  accountLabel,
  type Account,
  type FinancialYear,
} from '../_lib/finance-types';
import { t } from '@/app/_ekklesia/i18n/core';

export function AccountsClient(): React.ReactElement {
  const accounts = useApiList<Account>('/api/v1/accounts');
  const years = useApiList<FinancialYear>('/api/v1/financial-years');
  const [dialog, setDialog] = useState<'account' | 'year' | null>(null);
  const [closing, setClosing] = useState<FinancialYear | null>(null);
  const { busyKey, run } = useRowAction();

  const grouped = useMemo(
    () =>
      ACCOUNT_TYPES.map((type) => ({
        type,
        rows: accounts.items
          .filter((a) => a.accountType === type)
          .sort((a, b) => a.code.localeCompare(b.code)),
      })).filter((g) => g.rows.length > 0),
    [accounts.items],
  );
  const byId = useMemo(
    () => new Map(accounts.items.map((a) => [a.id, a])),
    [accounts.items],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('Accounts & years')}
        lede={t('The chart of accounts every journal, offering and expense posts to, and the financial years they fall in.')}
      />

      <Panel
        title={t('Financial years')}
        subtitle={t('Journals can only be posted into an open year.')}
        actions={
          <Button size="sm" iconLeft="plus" onClick={() => setDialog('year')}>
            {t('New year')}
          </Button>
        }
        flush
      >
        <ListState
          loading={years.loading}
          error={years.error}
          forbidden={years.forbidden}
          isEmpty={years.items.length === 0}
          onRetry={() => void years.reload()}
          empty={{
            icon: 'calendar',
            title: t('No financial years yet'),
            description: t('Create the current year before recording journals.'),
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{t('Year')}</TH>
                  <TH>{t('Starts')}</TH>
                  <TH>{t('Ends')}</TH>
                  <TH>{t('Status')}</TH>
                  <TH className="text-right">{t('Actions')}</TH>
                </TR>
              </THead>
              <TBody>
                {years.items.map((y) => (
                  <TR key={y.id}>
                    <TD className="font-medium text-foreground">{t(y.label)}</TD>
                    <TD className="text-sm">{formatDate(y.startsOn)}</TD>
                    <TD className="text-sm">{formatDate(y.endsOn)}</TD>
                    <TD>
                      <StatusPill tone={y.status === 'open' ? 'success' : 'neutral'}>
                        {titleCase(y.status)}
                      </StatusPill>
                    </TD>
                    <TD className="text-right">
                      {y.status === 'open' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyKey === y.id}
                          disabled={busyKey !== null}
                          onClick={() => setClosing(y)}
                        >
                          {t('Close year')}
                        </Button>
                      ) : null}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </ListState>
      </Panel>

      <Panel
        title={t('Chart of accounts')}
        subtitle={accounts.loading ? t('Loading…') : t('{0} accounts', accounts.items.length)}
        actions={
          <Button size="sm" iconLeft="plus" onClick={() => setDialog('account')}>
            {t('New account')}
          </Button>
        }
        flush
      >
        <ListState
          loading={accounts.loading}
          error={accounts.error}
          forbidden={accounts.forbidden}
          isEmpty={accounts.items.length === 0}
          onRetry={() => void accounts.reload()}
          empty={{
            icon: 'wallet',
            title: t('No accounts yet'),
            description:
              t('Add at least a bank/cash asset account and an offerings income account.'),
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{t('Code')}</TH>
                  <TH>{t('Name')}</TH>
                  <TH>{t('Parent')}</TH>
                  <TH>{t('Status')}</TH>
                </TR>
              </THead>
              {grouped.map((g) => (
                <TBody key={g.type}>
                  <TR noHover>
                    <TD
                      colSpan={4}
                      className="bg-surface-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {titleCase(g.type)}
                    </TD>
                  </TR>
                  {g.rows.map((a) => (
                    <TR key={a.id}>
                      <TD className="font-mono text-xs">{a.code}</TD>
                      <TD className="font-medium text-foreground">{a.name}</TD>
                      <TD className="text-sm text-muted-foreground">
                        {a.parentId ? accountLabel(byId.get(a.parentId)) : '—'}
                      </TD>
                      <TD>
                        <StatusPill tone={a.status === 'active' ? 'success' : 'neutral'}>
                          {titleCase(a.status)}
                        </StatusPill>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              ))}
            </Table>
          </TableWrap>
        </ListState>
      </Panel>

      {dialog === 'account' ? (
        <CreateAccountDialog
          accounts={accounts.items}
          onClose={() => setDialog(null)}
          onCreated={() => {
            setDialog(null);
            void accounts.reload();
          }}
        />
      ) : null}
      {dialog === 'year' ? (
        <CreateYearDialog
          onClose={() => setDialog(null)}
          onCreated={() => {
            setDialog(null);
            void years.reload();
          }}
        />
      ) : null}
      {closing ? (
        <FormDialog
          title={t('Close {0}?', closing.label)}
          description={t('No more journals can be posted into a closed year. This cannot be undone from the app.')}
          submitLabel={t('Close year')}
          submitVariant="destructive"
          size="sm"
          onClose={() => setClosing(null)}
          onSubmit={async () => {
            const year = closing;
            setClosing(null);
            const ok = await run(
              year.id,
              () =>
                apiFetch(`/api/v1/financial-years/${year.id}/close`, { method: 'POST' }),
              { success: t('{0} closed', year.label), failure: t('Could not close the year') },
            );
            if (ok) void years.reload();
          }}
        >
          {() => null}
        </FormDialog>
      ) : null}
    </div>
  );
}

function CreateAccountDialog({
  accounts,
  onClose,
  onCreated,
}: {
  accounts: Account[];
  onClose: () => void;
  onCreated: () => void;
}): React.ReactElement {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<string>('asset');
  const [parentId, setParentId] = useState('');
  const parents = accounts.filter((a) => a.accountType === accountType);

  return (
    <FormDialog
      title={t('New account')}
      submitLabel={t('Create account')}
      size="sm"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!code.trim()) e.code = t('Enter a code, e.g. 1000.');
        if (!name.trim()) e.name = t('Enter a name.');
        return e;
      }}
      onSubmit={async () => {
        await apiFetch('/api/v1/accounts', {
          method: 'POST',
          json: {
            code: code.trim(),
            name: name.trim(),
            accountType,
            ...(parentId ? { parentId } : {}),
          },
        });
        onCreated();
      }}
    >
      {(errors) => (
        <>
          <Field label={t('Code')} required error={errors.code}>
            <Input
              data-autofocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="1000"
              maxLength={50}
            />
          </Field>
          <Field label={t('Name')} required error={errors.name}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('Cash at bank')}
              maxLength={200}
            />
          </Field>
          <Field label={t('Type')} error={errors.accountType}>
            <Select
              value={accountType}
              onChange={(e) => {
                setAccountType(e.target.value);
                setParentId('');
              }}
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('Parent account')} hint={t('Optional grouping.')} error={errors.parentId}>
            <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">{t('None')}</option>
              {parents.map((a) => (
                <option key={a.id} value={a.id}>
                  {accountLabel(a)}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}
    </FormDialog>
  );
}

function CreateYearDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}): React.ReactElement {
  const [label, setLabel] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');

  return (
    <FormDialog
      title={t('New financial year')}
      submitLabel={t('Create year')}
      size="sm"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!label.trim()) e.label = t('Enter a label, e.g. FY2027.');
        if (!startsOn) e.startsOn = t('Choose a start date.');
        if (!endsOn) e.endsOn = t('Choose an end date.');
        if (startsOn && endsOn && endsOn <= startsOn) e.endsOn = t('End must be after the start.');
        return e;
      }}
      onSubmit={async () => {
        await apiFetch('/api/v1/financial-years', {
          method: 'POST',
          json: { label: label.trim(), startsOn, endsOn },
        });
        onCreated();
      }}
    >
      {(errors) => (
        <>
          <Field label={t('Label')} required error={errors.label}>
            <Input
              data-autofocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('FY2027')}
              maxLength={50}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('Starts on')} required error={errors.startsOn}>
              <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </Field>
            <Field label={t('Ends on')} required error={errors.endsOn}>
              <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
            </Field>
          </div>
        </>
      )}
    </FormDialog>
  );
}
