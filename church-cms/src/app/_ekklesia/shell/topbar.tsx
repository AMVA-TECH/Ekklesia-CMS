'use client';

import type { ReactNode } from 'react';
import { Icon } from '../icons';
import { BrandMark } from '../ui/brand-mark';
import { cn } from '../ui/utils';

/** Props for `<Topbar>`. */
export interface TopbarProps {
  /**
   * Fires when the mobile menu button is pressed.
   * The host screen wires this to a `<MobileDrawer>`.
   */
  onOpenDrawer?: () => void;
  /** Context displayed between the brand and the right cluster. */
  centerSlot?: ReactNode;
  /** Right cluster (notifications, language switcher, account menu). */
  endSlot?: ReactNode;
  /** Hide the mobile brand mark (useful when it duplicates a page header). */
  hideMobileBrand?: boolean;
  /** Variant swaps the padding + border treatment. */
  variant?: 'admin' | 'member';
  className?: string;
}

/**
 * Sticky top header shared by admin + member shells.
 *
 * - Shows a hamburger on `< lg` for the sidebar/drawer pattern.
 * - Carries the brand mark on `< lg` so mobile users always see identity.
 * - Hosts a flexible right-side cluster (notifications, user, language).
 */
export function Topbar({
  onOpenDrawer,
  centerSlot,
  endSlot,
  hideMobileBrand = false,
  variant = 'admin',
  className,
}: TopbarProps): React.ReactElement {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-[var(--layout-topbar-height,3.5rem)] items-center gap-2 border-b border-border bg-surface/95 px-4 backdrop-blur',
        variant === 'member' && 'bg-surface',
        className,
      )}
    >
      {onOpenDrawer ? (
        <button
          type="button"
          onClick={onOpenDrawer}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-ring lg:hidden"
          aria-label="Open navigation"
        >
          <Icon name="menu" size={20} />
        </button>
      ) : null}
      {hideMobileBrand ? null : (
        <div className="min-w-0 flex-1 lg:hidden">
          <BrandMark
            href={variant === 'admin' ? '/admin/dashboard' : '/home'}
            size={28}
            variant="symbol"
            surface="light"
          />
        </div>
      )}
      {centerSlot ? (
        <div className="hidden min-w-0 flex-1 items-center lg:flex">{centerSlot}</div>
      ) : (
        <div className="hidden flex-1 lg:block" />
      )}
      {endSlot ? <div className="flex shrink-0 items-center gap-1">{endSlot}</div> : null}
    </header>
  );
}
