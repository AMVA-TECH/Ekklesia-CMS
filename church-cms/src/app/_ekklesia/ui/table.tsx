import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { cn } from './utils';

/**
 * Lightweight table primitives.
 *
 * Why not a data-table component? Columns, sorting, filtering vary per
 * module and are better owned by the feature. These primitives:
 *  - style head/body/rows consistently with Ekklesia tokens
 *  - add horizontal scrolling wrapper on narrow viewports
 *  - set sensible defaults (sticky head, zebra-off, hover state)
 *
 * Compose with `<Panel flush>`:
 *
 * ```tsx
 * <Panel title="People" flush>
 *   <TableWrap>
 *     <Table>
 *       <THead>
 *         <TR><TH>Name</TH><TH>Role</TH></TR>
 *       </THead>
 *       <TBody>
 *         <TR><TD>Ada Noah</TD><TD>Member</TD></TR>
 *       </TBody>
 *     </Table>
 *   </TableWrap>
 * </Panel>
 * ```
 */

/** Scroll wrapper — put this around every `<Table>`. */
export function TableWrap({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn('overflow-x-auto -mx-px', className)}
      role="region"
      {...rest}
    >
      {children}
    </div>
  );
}

/** Semantic `<table>` with Ekklesia defaults. */
export function Table({
  className,
  children,
  ...rest
}: TableHTMLAttributes<HTMLTableElement>): React.ReactElement {
  return (
    <table
      className={cn(
        'w-full border-collapse text-left text-sm text-foreground',
        className,
      )}
      {...rest}
    >
      {children}
    </table>
  );
}

/** Table head. Sticky by default. */
export function THead({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>): React.ReactElement {
  return (
    <thead
      className={cn(
        'sticky top-0 z-10 bg-surface border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...rest}
    >
      {children}
    </thead>
  );
}

/** Table body. */
export function TBody({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>): React.ReactElement {
  return (
    <tbody className={cn('divide-y divide-border', className)} {...rest}>
      {children}
    </tbody>
  );
}

/** Table row with hover/selected treatments. */
export interface TRProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Highlight as selected. */
  selected?: boolean;
  /** Disable the hover treatment (e.g. header rows). */
  noHover?: boolean;
}

export function TR({
  selected = false,
  noHover = false,
  className,
  children,
  ...rest
}: TRProps): React.ReactElement {
  return (
    <tr
      aria-selected={selected || undefined}
      className={cn(
        'transition-colors motion-reduce:transition-none',
        !noHover && 'hover:bg-surface-muted/60',
        selected && 'bg-brand-gold-tint/60',
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}

/** Table header cell. */
export function TH({
  className,
  children,
  scope = 'col',
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>): React.ReactElement {
  return (
    <th
      scope={scope}
      className={cn(
        'px-4 py-2.5 text-left font-semibold whitespace-nowrap',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

/** Table body cell. */
export function TD({
  className,
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>): React.ReactElement {
  return (
    <td className={cn('px-4 py-3 align-middle', className)} {...rest}>
      {children}
    </td>
  );
}
