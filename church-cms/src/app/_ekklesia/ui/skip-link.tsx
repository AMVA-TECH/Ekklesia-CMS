import type { AnchorHTMLAttributes } from 'react';
import { cn } from './utils';

/** Props for `<SkipLink>`. */
export interface SkipLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Id of the main content landmark to jump to. Defaults to `main-content`. */
  targetId?: string;
}

/**
 * First-child accessibility helper: lets keyboard users skip to main content.
 *
 * Mount at the very top of each shell's layout (above the topbar).
 * The link is visually hidden until focused.
 */
export function SkipLink({
  targetId = 'main-content',
  className,
  children,
  ...rest
}: SkipLinkProps): React.ReactElement {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        'sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]',
        'focus:inline-flex focus:items-center focus:gap-2 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2',
        'focus:text-sm focus:font-medium focus:text-foreground focus:shadow-pop focus-ring',
        className,
      )}
      {...rest}
    >
      {children ?? 'Skip to main content'}
    </a>
  );
}
