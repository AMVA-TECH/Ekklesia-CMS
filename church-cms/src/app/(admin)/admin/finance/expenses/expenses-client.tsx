'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
import { formatDate, formatMoney, titleCase } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import { accountLabel, type Account } from '../_lib/finance-types';
import type { Expense } from './expense-types';
import { t } from '@/app/_ekklesia/i18n/core';

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

  const act = async (e: Expense, action: 'submit' | 'post'): Promise<void> => {
    const ok = await run(
      `${e.id}:${action}`,
      () => apiFetch(`/api/v1/expenses/${e.id}/${action}`, { method: 'POST' }),
      action === 'submit'
        ? {
            success: t('Submitted for approval'),
            detail: t('A second person must approve it in Approvals.'),
            failure: t('Could not submit'),
          }
        : { success: t('Posted to the ledger'), failure: t('Could not post') },
    );
    if (ok) void expenses.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('Expenses')}
        lede={t('Record a spend as a draft, submit it, and a second person approves it in Approvals. Approved expenses with accounts set are posted to the ledger automatically.')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/approvals"
              className={buttonClassName({ variant: 'secondary' })}
            >
              {t('Approvals')}
            </Link>
            <Button iconLeft="plus" onClick={() => setCreating(true)}>
              {t('New expense')}
            </Button>
          </div>
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabList aria-label={t('Expense status')}>
          {FILTERS.map((f) => (
            <Tab key={f} value={f}>
              {titleCase(f)}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title={t('Expenses')}
        subtitle={expenses.loading ? t('Loading…') : t('{0} shown', expenses.items.length)}
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
            title: t('No expenses here'),
            description: t('Record a payment request to start the approval flow.'),
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{t('Purpose')}</TH>
                  <TH>{t('Date')}</TH>
                  <TH className="text-right">{t('Amount')}</TH>
                  <TH className="hidden lg:table-cell">{t('Accounts')}</TH>
                  <TH>{t('Status')}</TH>
                  <TH className="text-right">{t('Actions')}</TH>
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
                      {e.accountId ? accountLabel(accountById.get(e.accountId)) : t('No expense account')}
                      <br />
                      {e.paymentAccountId
                        ? t('from {0}', accountLabel(accountById.get(e.paymentAccountId)))
                        : t('No payment account')}
                    </TD>
                    <TD>
                      <StatusPill tone={TONE[e.status]}>{titleCase(e.status)}</StatusPill>
                    </TD>
                    <TD className="text-right">
                      {e.status === 'draft' ? (
                        <Button
                          size="sm"
                          loading={busyKey === `${e.id}:submit`}
                          disabled={busyKey !== null}
                          onClick={() => void act(e, 'submit')}
                        >
                          {t('Submit')}
                        </Button>
                      ) : e.status === 'approved' && !e.journalId ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyKey === `${e.id}:post`}
                          disabled={busyKey !== null || !e.accountId || !e.paymentAccountId}
                          title={
                            !e.accountId || !e.paymentAccountId
                              ? t('Set both accounts to post this expense')
                              : undefined
                          }
                          onClick={() => void act(e, 'post')}
                        >
                          {t('Post')}
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
      title={t('New expense')}
      description={t('Saved as a draft. Submit it from the list to request approval.')}
      submitLabel={t('Save draft')}
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (toMinorUnits(amount) === null) e.amountMinor = t('Enter an amount greater than zero.');
        if (!expenseDate) e.expenseDate = t('Choose a date.');
        if (!purpose.trim()) e.purpose = t('Describe what the money is for.');
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
            <Field label={t('Amount (TZS)')} required error={errors.amountMinor}>
              <Input
                data-autofocus
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150000"
              />
            </Field>
            <Field label={t('Date')} required error={errors.expenseDate}>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label={t('Purpose')} required error={errors.purpose}>
            <Textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder={t('Sound system repair for Sunday service')}
            />
          </Field>
          <Field label={t('Ministry / unit')} error={errors.organisationalUnitId}>
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">{t('Church-wide')}</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('Expense account')}
              hint={t('Needed to post automatically.')}
              error={errors.accountId}
            >
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">{t('Choose later')}</option>
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {accountLabel(a)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Paid from')} hint={t('Bank or cash account.')} error={errors.paymentAccountId}>
              <Select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
              >
                <option value="">{t('Choose later')}</option>
                {paymentAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {accountLabel(a)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={t('Fund')} error={errors.fundId}>
            <Select value={fundId} onChange={(e) => setFundId(e.target.value)}>
              <option value="">{t('No specific fund')}</option>
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
