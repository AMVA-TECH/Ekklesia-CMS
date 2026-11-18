'use client';

import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Icon, type IconName } from '../icons';
import { cn } from './utils';

interface MenuTriggerInjected {
  id?: string;
  'aria-haspopup'?: 'menu';
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
}

/** Props for `<Menu>`. */
export interface MenuProps {
  /**
   * The trigger element (typically a `<button>`). Receives
   * `aria-haspopup`, `aria-expanded`, and open/close handlers via `cloneElement`.
   * The trigger must be a native-focusable element; the menu finds it by
   * walking the wrapper's children so no ref merging is required.
   */
  trigger: ReactElement<MenuTriggerInjected>;
  /** Menu items — see `<MenuItem>` + `<MenuSeparator>`. */
  children: ReactNode;
  /**
   * Horizontal alignment relative to the trigger. Defaults to `end` (right).
   */
  align?: 'start' | 'end';
  /** Accessible menu label (shown to screen readers). */
  label?: string;
}

/**
 * Lightweight dropdown menu.
 *
 * Opens on click/Enter/Space, closes on outside click / Escape / selection.
 * Uses `role="menu"` + `role="menuitem"`; arrow keys move focus between items.
 * No portal — the menu renders in-place, which keeps styles predictable.
 * For a modal popover, use `<Dialog>` instead.
 */
export function Menu({
  trigger,
  children,
  align = 'end',
  label,
}: MenuProps): React.ReactElement {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const reactId = useId();
  const triggerId = `menu-${reactId}-trigger`;
  const menuId = `menu-${reactId}`;

  const findTriggerElement = (): HTMLElement | null => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return null;
    // The trigger is always the first direct focusable child.
    return wrapper.querySelector<HTMLElement>(
      'button, a[href], [role="button"], [tabindex]',
    );
  };

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => findTriggerElement()?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, close]);

  // Focus the first menu item when the menu opens via keyboard.
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
  }, [open]);

  const handleMenuKey = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = items[(index + 1 + items.length) % items.length];
      next?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const next = items[(index - 1 + items.length) % items.length];
      next?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === 'Tab') {
      // Tabbing out closes the menu but preserves native focus flow.
      setOpen(false);
    }
  };

  if (!isValidElement(trigger)) {
    throw new Error('<Menu> expects a single element as the trigger.');
  }

  const triggerProps = trigger.props;
  const injected: MenuTriggerInjected = {
    id: triggerProps.id ?? triggerId,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': menuId,
    onClick: (event) => {
      triggerProps.onClick?.(event);
      setOpen((v) => !v);
    },
    onKeyDown: (event) => {
      triggerProps.onKeyDown?.(event);
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setOpen(true);
      }
    },
  };

  return (
    <div ref={wrapperRef} className="relative inline-flex">
      {cloneElement(trigger, injected)}
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          aria-label={label}
          onKeyDown={handleMenuKey}
          className={cn(
            'absolute top-full mt-1 z-40 min-w-[12rem] rounded-md border border-border bg-surface p-1 shadow-pop',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          <MenuCloseContext.Provider value={close}>
            {children}
          </MenuCloseContext.Provider>
        </div>
      ) : null}
    </div>
  );
}

const MenuCloseContext = createContext<() => void>(() => {});

/** Props for `<MenuItem>`. */
export interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconName;
  /** When true, visually marks the item as destructive. */
  destructive?: boolean;
}

/** Row inside `<Menu>`. Selecting an item closes the menu. */
export function MenuItem({
  icon,
  destructive = false,
  className,
  onClick,
  children,
  type,
  ...rest
}: MenuItemProps): React.ReactElement {
  const close = useContext(MenuCloseContext);
  return (
    <button
      role="menuitem"
      type={type ?? 'button'}
      className={cn(
        'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-sm text-left',
        'text-foreground hover:bg-surface-muted focus-ring',
        destructive && 'text-[color:var(--danger-ink)] hover:bg-[color:var(--danger-soft)]',
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) close();
      }}
      {...rest}
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
}

/** Horizontal divider between menu groups. */
export function MenuSeparator({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cn('my-1 h-px bg-border', className)}
      {...rest}
    />
  );
}

/** Non-interactive heading at the top of a menu group. */
export function MenuLabel({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        'px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
