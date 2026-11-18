import { Button } from './button';
import { cn } from './utils';

/** Props for `<Pagination>`. */
export interface PaginationProps {
  /** Current 1-based page number. */
  page: number;
  /** Total pages (undefined when unknown; shown as "Next/Prev" only). */
  totalPages?: number;
  /** Called with the next page number. */
  onPageChange: (nextPage: number) => void;
  /** Disable while data is loading. */
  disabled?: boolean;
  className?: string;
  /** Accessible label for the wrapper `<nav>`. */
  label?: string;
}

/**
 * Minimal pagination: Prev / {current of total} / Next.
 *
 * Deliberate: no window of numeric page links. Church screens rarely need
 * jump-by-page, and keyboard flow is simpler with just two controls.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  className,
  label = 'Pagination',
}: PaginationProps): React.ReactElement {
  const hasPrev = page > 1 && !disabled;
  const hasNext = (totalPages === undefined || page < totalPages) && !disabled;
  return (
    <nav
      aria-label={label}
      className={cn('flex items-center justify-between gap-3', className)}
    >
      <Button
        variant="secondary"
        size="sm"
        iconLeft="chevron-left"
        disabled={!hasPrev}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <p className="text-sm text-muted-foreground tabular-nums">
        Page <span className="font-medium text-foreground">{page}</span>
        {totalPages !== undefined ? (
          <>
            {' '}of <span className="font-medium text-foreground">{totalPages}</span>
          </>
        ) : null}
      </p>
      <Button
        variant="secondary"
        size="sm"
        iconRight="chevron-right"
        disabled={!hasNext}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
