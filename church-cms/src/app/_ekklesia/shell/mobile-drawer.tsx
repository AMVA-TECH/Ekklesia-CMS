'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../icons';
import { BrandMark } from '../ui/brand-mark';
import { cn } from '../ui/utils';
import { RoleNav, type NavGroup } from './role-nav';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Props for `<MobileDrawer>`. */
export interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  groups: readonly NavGroup[];
  /** Optional slot below the nav (e.g. account summary / language). */
  footer?: ReactNode;
  /** Church name under the brand mark. */
  churchName?: string;
}

/**
 * Off-canvas mobile sidebar.
 *
 * - Full-screen overlay + 85vw slide-in panel.
 * - Focus trap, Escape to close, body scroll lock.
 * - Automatically closes when any nav link is activated (click bubbles up).
 */
export function MobileDrawer({
  open,
  onClose,
  groups,
  footer,
  churchName,
}: MobileDrawerProps): React.ReactElement | null {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    const prevActive = document.activeElement as HTMLElement | null;

    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const root = rootRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);

    const raf = window.requestAnimationFrame(() => {
      const root = rootRef.current;
      root?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKey);
      body.style.overflow = prevOverflow;
      prevActive?.focus?.();
    };
  }, [open, onClose]);

  const handleLinkActivate = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      // Close drawer when a nav link is clicked (default-click, not ctrl/shift).
      const anchor = target.closest('a[href]');
      if (anchor && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        // Defer so navigation handlers run first.
        setTimeout(onClose, 0);
      }
    },
    [onClose],
  );

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40"
      />
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label="Primary navigation"
        className={cn(
          'absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col shadow-pop',
          'border-r border-[color:var(--sidebar-border)] bg-[color:var(--sidebar-background)] text-[color:var(--sidebar-foreground)]',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-[color:var(--sidebar-border)] px-4">
          <BrandMark
            size={28}
            subline={churchName}
            variant="symbol"
            surface="dark"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[color:var(--sidebar-muted)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-foreground)] focus-ring"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pb-4" onClick={handleLinkActivate}>
          <RoleNav groups={groups} />
        </div>
        {footer ? (
          <div className="border-t border-[color:var(--sidebar-border)] p-3">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
