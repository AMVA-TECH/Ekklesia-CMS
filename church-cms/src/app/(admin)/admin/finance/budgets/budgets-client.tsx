'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
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
  Table,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/app/_ekklesia/ui';
import type { Fund, OrganisationalUnit } from '../../../_lib/api-types';
import { FormDialog, ListState } from '../../../_components/kit';
import { toMinorUnits } from '../../../_lib/errors';
import { formatMoney } from '../../../_lib/format';
import { useApiList } from '../../../_lib/use-api-list';
import {
  accountLabel,
  type Account,
  type Budget,
  type FinancialYear,
} from '../_lib/finance-types';

const PERIOD_KINDS = ['monthly', 'quarterly', 'yearly'] as const;

export function BudgetsClient(): React.ReactElement {
  const t = useTranslations('AdminPages');
  const tf = useTranslations('AdminFinance');
  const budgets = useApiList<Budget>('/api/v1/budgets');
  const accounts = useApiList<Account>('/api/v1/accounts');
  const years = useApiList<FinancialYear>('/api/v1/financial-years');
  const funds = useApiList<Fund>('/api/v1/funds');
  const units = useApiList<OrganisationalUnit>('/api/v1/organisational-units?limit=100');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const accountById = useMemo(
    () => new Map(accounts.items.map((a) => [a.id, a])),
    [accounts.items],
  );
  const yearById = useMemo(() => new Map(years.items.map((y) => [y.id, y])), [years.items]);

  const periodKindLabel = (kind: string): string => {
    switch (kind) {
      case 'monthly':
        return tf('periodKindMonthly');
      case 'quarterly':
        return tf('periodKindQuarterly');
      case 'yearly':
        return tf('periodKindYearly');
      default:
        return kind;
    }
  };

  const scope = (b: Budget): string =>
    [
      b.fundId ? funds.items.find((f) => f.id === b.fundId)?.name : null,
      b.organisationalUnitId
        ? units.items.find((u) => u.id === b.organisationalUnitId)?.name
        : null,
    ]
      .filter(Boolean)
      .join(' · ') || tf('churchWide');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('budgets')}
        lede={t('budgetsLede')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/reports?report=R-FIN-06"
              className={buttonClassName({ variant: 'secondary' })}
            >
              {tf('budgetVsActual')}
            </Link>
            <Button iconLeft="plus" onClick={() => setCreating(true)}>
              {tf('newBudget')}
            </Button>
          </div>
        }
      />

      <Panel
        title={tf('allBudgets')}
        subtitle={
          budgets.loading
            ? tf('loading')
            : tf('budgetsTotal', { count: budgets.items.length })
        }
        flush
      >
        <ListState
          loading={budgets.loading}
          error={budgets.error}
          forbidden={budgets.forbidden}
          isEmpty={budgets.items.length === 0}
          onRetry={() => void budgets.reload()}
          empty={{
            icon: 'chart',
            title: tf('noBudgetsYet'),
            description: tf('noBudgetsBody'),
          }}
        >
          <TableWrap>
            <Table>
              <THead>
                <TR noHover>
                  <TH>{tf('budget')}</TH>
                  <TH>{tf('period')}</TH>
                  <TH>{tf('scope')}</TH>
                  <TH className="text-right">{tf('planned')}</TH>
                  <TH>{tf('status')}</TH>
                </TR>
              </THead>
              <TBody>
                {budgets.items.map((b) => {
                  const open = expanded === b.id;
                  return (
                    <Fragment key={b.id}>
                      <TR>
                        <TD>
                          <button
                            type="button"
                            aria-expanded={open}
                            className="-my-2 inline-flex min-h-10 items-center text-left font-medium text-foreground hover:underline focus-ring"
                            onClick={() => setExpanded(open ? null : b.id)}
                          >
                            {b.name}
                          </button>
                          <div className="text-xs text-muted-foreground">
                            {yearById.get(b.financialYearId)?.label ?? ''}
                          </div>
                        </TD>
                        <TD className="text-sm">
                          {tf('periodDisplay', {
                            kind: periodKindLabel(b.periodKind),
                            key: b.periodKey,
                          })}
                        </TD>
                        <TD className="text-sm text-muted-foreground">{scope(b)}</TD>
                        <TD className="text-right tabular-nums">{formatMoney(b.plannedMinor)}</TD>
                        <TD>
                          <StatusPill tone={b.status === 'active' ? 'success' : 'neutral'}>
                            {b.status === 'active' ? tf('statusActive') : b.status}
                          </StatusPill>
                        </TD>
                      </TR>
                      {open ? (
                        <TR noHover>
                          <TD colSpan={5} className="bg-surface-muted">
                            <ul className="divide-y divide-border text-sm">
                              {b.lines.map((l) => (
                                <li key={l.id} className="flex justify-between py-1">
                                  <span>{accountLabel(accountById.get(l.accountId))}</span>
                                  <span className="tabular-nums">{formatMoney(l.amountMinor)}</span>
                                </li>
                              ))}
                            </ul>
                          </TD>
                        </TR>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
        </ListState>
      </Panel>

      {creating ? (
        <CreateBudgetDialog
          accounts={accounts.items}
          years={years.items}
          funds={funds.items}
          units={units.items}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void budgets.reload();
          }}
        />
      ) : null}
    </div>
  );
}

let nextKey = 1;

function CreateBudgetDialog({
  accounts,
  years,
  funds,
  units,
  onClose,
  onCreated,
}: {
  accounts: Account[];
  years: FinancialYear[];
  funds: Fund[];
  units: OrganisationalUnit[];
  onClose: () => void;
  onCreated: () => void;
}): React.ReactElement {
  const tf = useTranslations('AdminFinance');
  const [name, setName] = useState('');
  const [yearId, setYearId] = useState(years.find((y) => y.status === 'open')?.id ?? years[0]?.id ?? '');
  const [periodKind, setPeriodKind] = useState<(typeof PERIOD_KINDS)[number]>('yearly');
  const [periodKey, setPeriodKey] = useState('');
  const [fundId, setFundId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [lines, setLines] = useState(() => [{ key: nextKey++, accountId: '', amount: '' }]);
  const budgetable = accounts.filter((a) => a.accountType === 'expense' || a.accountType === 'income');
  const total = lines.reduce((s, l) => s + (toMinorUnits(l.amount) ?? 0), 0);

  const periodHint = (kind: (typeof PERIOD_KINDS)[number]): string => {
    switch (kind) {
      case 'monthly':
        return tf('periodHintMonthly');
      case 'quarterly':
        return tf('periodHintQuarterly');
      case 'yearly':
        return tf('periodHintYearly');
    }
  };

  const periodKindLabel = (kind: string): string => {
    switch (kind) {
      case 'monthly':
        return tf('periodKindMonthly');
      case 'quarterly':
        return tf('periodKindQuarterly');
      case 'yearly':
        return tf('periodKindYearly');
      default:
        return kind;
    }
  };

  return (
    <FormDialog
      title={tf('newBudgetTitle')}
      submitLabel={tf('createBudget')}
      size="lg"
      onClose={onClose}
      validate={() => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = tf('enterName');
        if (!yearId) e.financialYearId = tf('createYearFirst');
        if (!periodKey.trim()) e.periodKey = tf('enterPeriod', { hint: periodHint(periodKind) });
        if (lines.some((l) => !l.accountId || toMinorUnits(l.amount) === null))
          e.lines = tf('eachLineNeedsAccountAmount');
        return e;
      }}
      onSubmit={async () => {
        await apiFetch('/api/v1/budgets', {
          method: 'POST',
          json: {
            financialYearId: yearId,
            name: name.trim(),
            periodKind,
            periodKey: periodKey.trim(),
            ...(fundId ? { fundId } : {}),
            ...(unitId ? { organisationalUnitId: unitId } : {}),
            lines: lines.map((l) => ({
              accountId: l.accountId,
              amountMinor: toMinorUnits(l.amount),
            })),
          },
        });
        onCreated();
      }}
    >
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tf('name')} required error={errors.name}>
              <Input
                data-autofocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tf('namePlaceholderBudget')}
                maxLength={200}
              />
            </Field>
            <Field label={tf('financialYear')} required error={errors.financialYearId}>
              <Select value={yearId} onChange={(e) => setYearId(e.target.value)}>
                {years.length === 0 ? <option value="">{tf('noYears')}</option> : null}
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tf('period')} error={errors.periodKind}>
              <Select
                value={periodKind}
                onChange={(e) => setPeriodKind(e.target.value as (typeof PERIOD_KINDS)[number])}
              >
                {PERIOD_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {periodKindLabel(k)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tf('periodKey')} required hint={periodHint(periodKind)} error={errors.periodKey}>
              <Input value={periodKey} onChange={(e) => setPeriodKey(e.target.value)} maxLength={32} />
            </Field>
            <Field label={tf('fund')} error={errors.fundId}>
              <Select value={fundId} onChange={(e) => setFundId(e.target.value)}>
                <option value="">{tf('anyFund')}</option>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
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
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-foreground">{tf('lines')}</legend>
            {lines.map((l, i) => (
              <div key={l.key} className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
                <Select
                  aria-label={tf('lineAccountAria', { n: i + 1 })}
                  value={l.accountId}
                  onChange={(e) =>
                    setLines((ls) =>
                      ls.map((x) => (x.key === l.key ? { ...x, accountId: e.target.value } : x)),
                    )
                  }
                >
                  <option value="">{tf('accountEllipsis')}</option>
                  {budgetable.map((a) => (
                    <option key={a.id} value={a.id}>
                      {accountLabel(a)}
                    </option>
                  ))}
                </Select>
                <Input
                  aria-label={tf('lineAmountAria', { n: i + 1 })}
                  inputMode="decimal"
                  placeholder={tf('amountPlaceholder')}
                  value={l.amount}
                  onChange={(e) =>
                    setLines((ls) =>
                      ls.map((x) => (x.key === l.key ? { ...x, amount: e.target.value } : x)),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft="trash"
                  aria-label={tf('removeLineAria', { n: i + 1 })}
                  disabled={lines.length <= 1}
                  onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                />
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                iconLeft="plus"
                onClick={() =>
                  setLines((ls) => [...ls, { key: nextKey++, accountId: '', amount: '' }])
                }
              >
                {tf('addLine')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {tf('totalAmount', { amount: formatMoney(total) })}
              </span>
            </div>
            {errors.lines ? (
              <p role="alert" className="text-sm text-[color:var(--danger-ink)]">
                {errors.lines}
              </p>
            ) : null}
          </fieldset>
        </>
      )}
    </FormDialog>
  );
}
