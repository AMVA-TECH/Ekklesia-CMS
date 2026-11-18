import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../ui/utils';

/** Props for `<AppFooter>`. */
export interface AppFooterProps extends HTMLAttributes<HTMLElement> {
  /** Optional lead copy (e.g. "Ekklesia · CrossLife Pilot"). */
  tagline?: ReactNode;
  /** Right-aligned auxiliary links/slot. */
  endSlot?: ReactNode;
}

/**
 * Thin page-bottom footer shared by admin + member shells.
 *
 * Intentionally sparse — most users will never read it; its job is to anchor
 * the page and expose legal / help links discoverably.
 */
export function AppFooter({
  tagline,
  endSlot,
  className,
  ...rest
}: AppFooterProps): React.ReactElement {
  return (
    <footer
      className={cn(
        'mt-auto border-t border-border bg-surface',
        'px-4 py-4 sm:px-6 sm:py-5',
        className,
      )}
      {...rest}
    >
      <div className="mx-auto flex max-w-[var(--layout-content-max,80rem)] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {tagline ?? (
            <>
              <span className="font-semibold text-foreground">Ekklesia</span> ·
              built for the local church
            </>
          )}
        </p>
        {endSlot ? <div className="text-xs text-muted-foreground">{endSlot}</div> : null}
      </div>
    </footer>
  );
}
