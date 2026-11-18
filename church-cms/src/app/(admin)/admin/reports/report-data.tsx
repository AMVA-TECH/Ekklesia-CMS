'use client';

import { useTranslations } from 'next-intl';
import { formatMoney, titleCase } from '../../_lib/format';

/**
 * Generic renderer for report payloads, whose shapes differ per report:
 * scalars → value, arrays of objects → table, objects → definition list.
 * Keys ending in `Minor` are formatted as money.
 */
export function ReportData({ data }: { data: unknown }): React.ReactElement {
  const tr = useTranslations('AdminReports');
  return <Value value={data} depth={0} tr={tr} />;
}

function label(key: string): string {
  return titleCase(
    key
      .replace(/Minor$/, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase(),
  );
}

function scalar(
  key: string,
  value: unknown,
  tr: ReturnType<typeof useTranslations<'AdminReports'>>,
): string {
  if (value === null || value === undefined || value === '') return tr('emDash');
  if (typeof value === 'number' && key.endsWith('Minor')) return formatMoney(value);
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? tr('yes') : tr('no');
  return String(value);
}

function isRow(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function Value({
  value,
  depth,
  name = '',
  tr,
}: {
  value: unknown;
  depth: number;
  name?: string;
  tr: ReturnType<typeof useTranslations<'AdminReports'>>;
}): React.ReactElement {
  if (Array.isArray(value)) {
    if (value.length === 0) return <p className="text-sm text-muted-foreground">{tr('noRows')}</p>;
    if (value.every(isRow)) {
      const cols = Array.from(new Set(value.flatMap((r) => Object.keys(r)))).filter(
        (c) => !value.some((r) => typeof r[c] === 'object' && r[c] !== null),
      );
      return (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs text-muted-foreground">
              <tr>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-2 font-medium">
                    {label(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {value.map((row, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td
                      key={c}
                      className={
                        typeof row[c] === 'number' ? 'px-3 py-2 text-right tabular-nums' : 'px-3 py-2'
                      }
                    >
                      {scalar(c, row[c], tr)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return <p className="text-sm">{value.map((v) => scalar(name, v, tr)).join(', ')}</p>;
  }
  if (isRow(value)) {
    const entries = Object.entries(value);
    const simple = entries.filter(([, v]) => typeof v !== 'object' || v === null);
    const nested = entries.filter(([, v]) => typeof v === 'object' && v !== null);
    return (
      <div className="flex flex-col gap-4">
        {simple.length > 0 ? (
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {simple.map(([k, v]) => (
              <div key={k} className="rounded-md bg-surface-muted px-3 py-2">
                <dt className="text-xs text-muted-foreground">{label(k)}</dt>
                <dd className="text-base font-semibold tabular-nums text-foreground">
                  {scalar(k, v, tr)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {nested.map(([k, v]) => (
          <section key={k} className="flex flex-col gap-2">
            {depth < 3 ? (
              <h3 className="text-sm font-semibold text-foreground">{label(k)}</h3>
            ) : null}
            <Value value={v} depth={depth + 1} name={k} tr={tr} />
          </section>
        ))}
      </div>
    );
  }
  return <p className="text-sm">{scalar(name, value, tr)}</p>;
}
