'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/app/_ekklesia/session';
import {
  Button,
  buttonClassName,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
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
import type { Fund, OrganisationalUnit } from '../../../_lib/api-types';
import { FormDialog, ListState, useRowAction } from '../../../_components/kit';
import { todayLocalIso, toMinorUnits } from '../../../_lib/errors';
import { formatDate, formatMoney } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import { accountLabel, type Account } from '../_lib/finance-types';
import type { Expense } from './expense-types';

const FILTERS = ['all', 'draft', 'pending_approval', 'approved', 'posted', 'rejected'] as const;
type Filter = (typeof FILTERS)[number];

const TONE = {
  draft: 'neutral',
  pending_approval: 'pending',
  approved: 'info',
  rejected: 'danger',
  posted: 'success',
} as const;

export function ExpensesClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tf = useTranslations('AdminFinance');
  const [filter, setFilter] = useState<Filter>('all');
  const expenses = useApiList<Expense>(
    `/api/v1/expenses?limit=100${filter === 'all' ? '' : `&status=${filter}`}`,
  );
  const accounts = useApiList<Account>('/api/v1/accounts');
  const funds = useApiList<Fund>('/api/v1/funds');
  const units = useApiList<OrganisationalUnit>('/api/v1/organisational-units?limit=100');
  const [creating, setCreating] = useState(false);
  const { busyKey, run } = useRowAction();

  const accountById = useMemo(
    () => new Map(accounts.items.map((a) => [a.id, a])),
    [accounts.items],
  );
  const unitById = useMemo(() => new Map(units.items.map((u) => [u.id, u])), [units.items]);

  const statusLabel = (status: string): string => {
    switch (status) {
      case 'all':
        return tf('statusAll');
      case 'draft':
        return tf('statusDraft');
      case 'pending_approval':
        return tf('statusPendingApproval');
      case 'approved':
        return tf('statusApproved');
      case 'posted':
        return tf('statusPosted');
      case 'rejected':
        return tf('statusRejected');
      default:
        return status;
    }
  };

  const act = async (e: Expense, action: 'submit' | 'post'): Promise<void> => {
    const ok = await run(
      `${e.id}:${action}`,
      () => apiFetch(`/api/v1/expenses/${e.id}/${action}`, { method: 'POST' }),
      action === 'submit'
        ? {
            success: tf('submittedForApproval'),
            detail: tf('submittedForApprovalDetail'),
            failure: tf('couldNotSubmit'),
          }
        : { success: tf('postedToTheLedger'), failure: tf('couldNotPost') },
    );
    if (ok) void expenses.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('expenses')}
        lede={t('expensesLede')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/approvals"
              className={buttonClassName({ variant: 'secondary' })}
            >
              {t('approvals')}
            </Link>
            <Button iconLeft="plus" onClick={() => setCreating(true)}>
              {tf('newExpense')}
            </Button>
          </div>
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabList aria-label={tf('expenseStatusAria')}>
          {FILTERS.map((f) => (
            <Tab key={f} value={f}>
              {statusLabel(f)}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={tf('expensesPanel')}
        subtitle={
          expenses.loading
            ? tf('loading')
            : tf('shownCount', { count: expenses.items.length })
        }
        flush
      >
        <ListState
          loading={expenses.loading}
          error={expenses.error}
          forbidden={expenses.forbidden}
          isEmpty={expenses.items.length === 0}
          onRetry={() => void expenses.reload()}
          empty={{
            icon: 'wallet',
            title: tf('noExpensesHere'),
            description: tf('noExpensesBody'),
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tf('purpose')}</TH>
                  <TH>{tf('date')}</TH>
                  <TH className="text-right">{tf('amount')}</TH>
                  <TH className="hidden lg:table-cell">{tf('accountsCol')}</TH>
                  <TH>{tf('status')}</TH>
                  <TH className="text-right">{tf('actions')}</TH>
                </TR>
              </THead>
              <TBody>
                {expenses.items.map((e) => (
                  <TR key={e.id}>
                    <TD>
                      <div className="font-medium text-foreground">{e.purpose}</div>
                      {e.organisationalUnitId ? (
                        <div className="text-xs text-muted-foreground">
                          {unitById.get(e.organisationalUnitId)?.name ?? ''}
                        </div>
                      ) : null}
                    </TD>
                    <TD className="text-sm">{formatDate(e.expenseDate)}</TD>
                    <TD className="text-right tabular-nums">
                      {formatMoney(e.amountMinor, e.currency)}
                    </TD>
                    <TD className="hidden text-xs text-muted-foreground lg:table-cell">
                      {e.accountId ? accountLabel(accountById.get(e.accountId)) : tf('noExpenseAccount')}
                      <br />
                      {e.paymentAccountId
                        ? tf('fromAccount', {
                            account: accountLabel(accountById.get(e.paymentAccountId)),
                          })
                        : tf('noPaymentAccount')}
                    </TD>
                    <TD>
                      <StatusPill tone={TONE[e.status]}>{statusLabel(e.status)}</StatusPill>
                    </TD>
                    <TD className="text-right">
                      {e.status === 'draft' ? (
                        <Button
                          size="sm"
                          loading={busyKey === `${e.id}:submit`}
                          disabled={busyKey !== null}
                          onClick={() => void act(e, 'submit')}
                        >
                          {tf('submit')}
                        </Button>
                      ) : e.status === 'approved' && !e.journalId ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyKey === `${e.id}:post`}
                          disabled={busyKey !== null || !e.accountId || !e.paymentAccountId}
                          title={
                            !e.accountId || !e.paymentAccountId
                              ? tf('setBothAccountsToPost')
                              : undefined
                          }
                          onClick={() => void act(e, 'post')}
                        >
                          {tf('post')}
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

      {creating ? (
        <CreateExpenseDialog
          accounts={accounts.items}
          funds={funds.items}
          units={units.items}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void expenses.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function CreateExpenseDialog({
  accounts,
  funds,
  units,
  onClose,
  onCreated,
}: {
  accounts: Account[];
  funds: Fund[];
  units: OrganisationalUnit[];
  onClose: () => void;
  onCreated: () => void;
}): React.ReactElement {
  const tf = useTranslations('AdminFinance');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayLocalIso);
  const [purpose, setPurpose] = useState('');
  const [unitId, setUnitId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [fundId, setFundId] = useState('');

  const expenseAccounts = accounts.filter((a) => a.accountType === 'expense');
  const paymentAccounts = accounts.filter((a) => a.accountType === 'asset');

  return (
    <FormDialog
      title={tf('newExpenseTitle')}
      description={tf('newExpenseDesc')}
      submitLabel={tf('saveDraft')}
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (toMinorUnits(amount) === null) e.amountMinor = tf('amountGreaterThanZero');
        if (!expenseDate) e.expenseDate = tf('chooseDate');
        if (!purpose.trim()) e.purpose = tf('describePurpose');
        return e;
      }}
      onSubmit={async () => {
        await apiFetch('/api/v1/expenses', {
          method: 'POST',
          json: {
            amountMinor: toMinorUnits(amount),
            expenseDate,
            purpose: purpose.trim(),
            ...(unitId ? { organisationalUnitId: unitId } : {}),
            ...(accountId ? { accountId } : {}),
            ...(paymentAccountId ? { paymentAccountId } : {}),
            ...(fundId ? { fundId } : {}),
          },
        });
        onCreated();
      }}
    >
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tf('amountTzs')} required error={errors.amountMinor}>
              <Input
                data-autofocus
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150000"
              />
            </Field>
            <Field label={tf('date')} required error={errors.expenseDate}>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label={tf('purpose')} required error={errors.purpose}>
            <Textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder={tf('purposePlaceholder')}
            />
          </Field>
          <Field label={tf('ministryUnit')} error={errors.organisationalUnitId}>
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">{tf('churchWide')}</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={tf('expenseAccount')}
              hint={tf('expenseAccountHint')}
              error={errors.accountId}
            >
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">{tf('chooseLater')}</option>
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {accountLabel(a)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tf('paidFrom')} hint={tf('paidFromHint')} error={errors.paymentAccountId}>
              <Select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
              >
                <option value="">{tf('chooseLater')}</option>
                {paymentAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {accountLabel(a)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={tf('fund')} error={errors.fundId}>
            <Select value={fundId} onChange={(e) => setFundId(e.target.value)}>
              <option value="">{tf('noSpecificFund')}</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}
    </FormDialog>
  );
}
