'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { formatDate } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import {
  ACCOUNT_TYPES,
  accountLabel,
  type Account,
  type FinancialYear,
} from '../_lib/finance-types';

export function AccountsClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tf = useTranslations('AdminFinance');
  const accounts = useApiList<Account>('/api/v1/accounts');
  const years = useApiList<FinancialYear>('/api/v1/financial-years');
  const [dialog, setDialog] = useState<'account' | 'year' | null>(null);
  const [closing, setClosing] = useState<FinancialYear | null>(null);
  const { busyKey, run } = useRowAction();

  const accountTypeLabel = (type: string): string => {
    switch (type) {
      case 'asset':
        return tf('accountTypeAsset');
      case 'liability':
        return tf('accountTypeLiability');
      case 'equity':
        return tf('accountTypeEquity');
      case 'income':
        return tf('accountTypeIncome');
      case 'expense':
        return tf('accountTypeExpense');
      default:
        return type;
    }
  };

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
        title={t('accounts')}
        lede={t('accountsLede')}
      />

      <Panel
        title={tf('financialYears')}
        subtitle={tf('financialYearsSubtitle')}
        actions={
          <Button size="sm" iconLeft="plus" onClick={() => setDialog('year')}>
            {tf('newYear')}
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
            title: tf('noFinancialYearsYet'),
            description: tf('noFinancialYearsBody'),
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tf('year')}</TH>
                  <TH>{tf('starts')}</TH>
                  <TH>{tf('ends')}</TH>
                  <TH>{tf('status')}</TH>
                  <TH className="text-right">{tf('actions')}</TH>
                </TR>
              </THead>
              <TBody>
                {years.items.map((y) => (
                  <TR key={y.id}>
                    <TD className="font-medium text-foreground">{y.label}</TD>
                    <TD className="text-sm">{formatDate(y.startsOn)}</TD>
                    <TD className="text-sm">{formatDate(y.endsOn)}</TD>
                    <TD>
                      <StatusPill tone={y.status === 'open' ? 'success' : 'neutral'}>
                        {y.status === 'open' ? tf('statusOpen') : tf('statusClosed')}
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
                          {tf('closeYear')}
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
        title={tf('chartOfAccounts')}
        subtitle={
          accounts.loading
            ? tf('loading')
            : tf('accountsCount', { count: accounts.items.length })
        }
        actions={
          <Button size="sm" iconLeft="plus" onClick={() => setDialog('account')}>
            {tf('newAccount')}
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
            title: tf('noAccountsYet'),
            description: tf('noAccountsBody'),
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tf('code')}</TH>
                  <TH>{tf('name')}</TH>
                  <TH>{tf('parent')}</TH>
                  <TH>{tf('status')}</TH>
                </TR>
              </THead>
              {grouped.map((g) => (
                <TBody key={g.type}>
                  <TR noHover>
                    <TD
                      colSpan={4}
                      className="bg-surface-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {accountTypeLabel(g.type)}
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
                          {a.status === 'active' ? tf('statusActive') : a.status}
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
          title={tf('closeYearTitle', { label: closing.label })}
          description={tf('closeYearDesc')}
          submitLabel={tf('closeYear')}
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
              { success: tf('yearClosed', { label: year.label }), failure: tf('couldNotCloseYear') },
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
  const tf = useTranslations('AdminFinance');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<string>('asset');
  const [parentId, setParentId] = useState('');
  const parents = accounts.filter((a) => a.accountType === accountType);

  const accountTypeLabel = (type: string): string => {
    switch (type) {
      case 'asset':
        return tf('accountTypeAsset');
      case 'liability':
        return tf('accountTypeLiability');
      case 'equity':
        return tf('accountTypeEquity');
      case 'income':
        return tf('accountTypeIncome');
      case 'expense':
        return tf('accountTypeExpense');
      default:
        return type;
    }
  };

  return (
    <FormDialog
      title={tf('newAccountTitle')}
      submitLabel={tf('createAccount')}
      size="sm"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!code.trim()) e.code = tf('enterCode');
        if (!name.trim()) e.name = tf('enterName');
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
          <Field label={tf('code')} required error={errors.code}>
            <Input
              data-autofocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={tf('codePlaceholderAccount')}
              maxLength={50}
            />
          </Field>
          <Field label={tf('name')} required error={errors.name}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tf('namePlaceholderAccount')}
              maxLength={200}
            />
          </Field>
          <Field label={tf('type')} error={errors.accountType}>
            <Select
              value={accountType}
              onChange={(e) => {
                setAccountType(e.target.value);
                setParentId('');
              }}
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {accountTypeLabel(type)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={tf('parentAccount')} hint={tf('parentAccountHint')} error={errors.parentId}>
            <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">{tf('none')}</option>
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
  const tf = useTranslations('AdminFinance');
  const [label, setLabel] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');

  return (
    <FormDialog
      title={tf('newYearTitle')}
      submitLabel={tf('createYear')}
      size="sm"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!label.trim()) e.label = tf('enterLabel');
        if (!startsOn) e.startsOn = tf('chooseStartDate');
        if (!endsOn) e.endsOn = tf('chooseEndDate');
        if (startsOn && endsOn && endsOn <= startsOn) e.endsOn = tf('endAfterStart');
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
          <Field label={tf('label')} required error={errors.label}>
            <Input
              data-autofocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={tf('labelPlaceholder')}
              maxLength={50}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tf('startsOn')} required error={errors.startsOn}>
              <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </Field>
            <Field label={tf('endsOn')} required error={errors.endsOn}>
              <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
            </Field>
          </div>
        </>
      )}
    </FormDialog>
  );
}
