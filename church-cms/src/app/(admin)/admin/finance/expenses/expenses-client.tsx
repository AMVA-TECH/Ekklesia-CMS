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
            success: 'Submitted for approval',
            detail: 'A second person must approve it in Approvals.',
            failure: 'Could not submit',
          }
        : { success: 'Posted to the ledger', failure: 'Could not post' },
    );
    if (ok) void expenses.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Expenses"
        lede="Record a spend as a draft, submit it, and a second person approves it in Approvals. Approved expenses with accounts set are posted to the ledger automatically."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/approvals"
              className={buttonClassName({ variant: 'secondary' })}
            >
              Approvals
            </Link>
            <Button iconLeft="plus" onClick={() => setCreating(true)}>
              New expense
            </Button>
          </div>
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabList aria-label="Expense status">
          {FILTERS.map((f) => (
            <Tab key={f} value={f}>
              {titleCase(f)}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <Panel
        title="Expenses"
        subtitle={expenses.loading ? 'Loading…' : `${expenses.items.length} shown`}
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
            title: 'No expenses here',
            description: 'Record a payment request to start the approval flow.',
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>Purpose</TH>
                  <TH>Date</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Accounts</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
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
                    <TD className="text-xs text-muted-foreground">
                      {e.accountId ? accountLabel(accountById.get(e.accountId)) : 'No expense account'}
                      <br />
                      {e.paymentAccountId
                        ? `from ${accountLabel(accountById.get(e.paymentAccountId))}`
                        : 'No payment account'}
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
                          Submit
                        </Button>
                      ) : e.status === 'approved' && !e.journalId ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyKey === `${e.id}:post`}
                          disabled={busyKey !== null || !e.accountId || !e.paymentAccountId}
                          title={
                            !e.accountId || !e.paymentAccountId
                              ? 'Set both accounts to post this expense'
                              : undefined
                          }
                          onClick={() => void act(e, 'post')}
                        >
                          Post
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
      title="New expense"
      description="Saved as a draft. Submit it from the list to request approval."
      submitLabel="Save draft"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (toMinorUnits(amount) === null) e.amountMinor = 'Enter an amount greater than zero.';
        if (!expenseDate) e.expenseDate = 'Choose a date.';
        if (!purpose.trim()) e.purpose = 'Describe what the money is for.';
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
            <Field label="Amount (TZS)" required error={errors.amountMinor}>
              <Input
                data-autofocus
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150000"
              />
            </Field>
            <Field label="Date" required error={errors.expenseDate}>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Purpose" required error={errors.purpose}>
            <Textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Sound system repair for Sunday service"
            />
          </Field>
          <Field label="Ministry / unit" error={errors.organisationalUnitId}>
            <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">Church-wide</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Expense account"
              hint="Needed to post automatically."
              error={errors.accountId}
            >
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Choose later</option>
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {accountLabel(a)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Paid from" hint="Bank or cash account." error={errors.paymentAccountId}>
              <Select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
              >
                <option value="">Choose later</option>
                {paymentAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {accountLabel(a)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Fund" error={errors.fundId}>
            <Select value={fundId} onChange={(e) => setFundId(e.target.value)}>
              <option value="">No specific fund</option>
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
