'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../icons';
import { cn } from './utils';

/** Props for `<Dialog>`. */
export interface DialogProps {
  /** Whether the dialog is currently open. */
  open: boolean;
  /** Called when the dialog requests to close (overlay click, Escape, close button). */
  onClose: () => void;
  /** Visible title — also the `aria-labelledby` target. */
  title: ReactNode;
  /** Short supporting copy — the `aria-describedby` target. */
  description?: ReactNode;
  /** Primary body content. */
  children: ReactNode;
  /** Right-aligned footer area (typically action buttons). */
  footer?: ReactNode;
  /**
   * Size hint for max width. `md` (default) is 32rem; `lg` is 48rem;
   * `sm` is 24rem. Below `sm` breakpoint the dialog is always full-width.
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * On viewports ≤ `sm` breakpoint, dock the dialog to the bottom like an
   * action sheet. Default `true` — a calmer mobile pattern.
   */
  sheetOnMobile?: boolean;
  /** Visually hide the top close button (Escape + overlay still close). */
  hideCloseButton?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-3xl',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Accessible modal dialog with a focus trap, Escape to dismiss, return-focus
 * to the invoker, and body scroll lock. Portals into `document.body`.
 *
 * On small screens the dialog docks to the bottom as a sheet; on larger
 * screens it centres with `max-width` + a soft overlay.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  sheetOnMobile = true,
  hideCloseButton = false,
}: DialogProps): React.ReactElement | null {
  const reactId = useId();
  const titleId = `dlg-${reactId}-title`;
  const descId = description ? `dlg-${reactId}-desc` : undefined;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Handle open/close lifecycle: lock scroll, trap focus, restore focus.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const focusInitial = (): void => {
      const root = dialogRef.current;
      if (!root) return;
      const target =
        root.querySelector<HTMLElement>('[data-autofocus]') ??
        root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
        root;
      target.focus();
    };
    // Defer by one frame to ensure the node is in the tree.
    const id = window.requestAnimationFrame(focusInitial);

    return () => {
      window.cancelAnimationFrame(id);
      body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('data-focus-skip'));
      if (focusables.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }
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
    },
    [onClose],
  );

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-stretch sm:items-center justify-center',
        sheetOnMobile ? 'sm:p-6' : 'p-4 sm:p-6',
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        data-focus-skip
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex w-full flex-col border border-border bg-surface shadow-pop outline-none',
          sheetOnMobile
            ? 'mt-auto rounded-t-xl sm:mt-0 sm:rounded-xl'
            : 'rounded-xl',
          'max-h-[90vh] sm:w-full',
          SIZE_CLASSES[size],
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {hideCloseButton ? null : (
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-ring"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3 bg-surface-muted/60">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** A thin wrapper to group dialog footer actions consistently. */
export function DialogFooter({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn('flex flex-wrap items-center justify-end gap-2', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
