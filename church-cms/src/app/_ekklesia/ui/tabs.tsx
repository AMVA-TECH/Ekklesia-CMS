'use client';

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from 'react';
import { cn } from './utils';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  idBase: string;
  orientation: 'horizontal' | 'vertical';
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(label: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${label}> must be rendered inside <Tabs>.`);
  return ctx;
}

/** Props for `<Tabs>`. */
export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  /** Controlled active tab value. */
  value?: string;
  /** Default active tab for uncontrolled usage. */
  defaultValue?: string;
  /** Called when the active tab changes. */
  onValueChange?: (value: string) => void;
  /** Orientation. Keyboard semantics follow the chosen axis. */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Accessible tabs following the WAI-ARIA Authoring Practices.
 *
 * ```tsx
 * <Tabs defaultValue="people">
 *   <TabList>
 *     <Tab value="people">People</Tab>
 *     <Tab value="households">Households</Tab>
 *   </TabList>
 *   <TabPanel value="people">…</TabPanel>
 *   <TabPanel value="households">…</TabPanel>
 * </Tabs>
 * ```
 */
export function Tabs({
  value: controlled,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  className,
  children,
  ...rest
}: TabsProps): React.ReactElement {
  const reactId = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '');
  const value = controlled ?? uncontrolled;
  const setValue = useCallback(
    (next: string) => {
      if (controlled === undefined) setUncontrolled(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange],
  );
  return (
    <TabsContext.Provider value={{ value, setValue, idBase: reactId, orientation }}>
      <div className={cn('flex flex-col gap-4', className)} {...rest}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/** Container for `<Tab>` triggers. */
export function TabList({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  const { orientation } = useTabsContext('TabList');
  const listRef = useRef<HTMLDivElement | null>(null);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const nodes = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [],
    ).filter((el) => !el.hasAttribute('disabled'));
    if (nodes.length === 0) return;
    const current = document.activeElement as HTMLElement | null;
    const index = current ? nodes.indexOf(current) : -1;
    const horizontal = orientation === 'horizontal';
    const next = horizontal ? 'ArrowRight' : 'ArrowDown';
    const prev = horizontal ? 'ArrowLeft' : 'ArrowUp';
    if (event.key === next) {
      event.preventDefault();
      nodes[(index + 1 + nodes.length) % nodes.length]?.focus();
    } else if (event.key === prev) {
      event.preventDefault();
      nodes[(index - 1 + nodes.length) % nodes.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      nodes[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      nodes[nodes.length - 1]?.focus();
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation={orientation}
      className={cn(
        'flex gap-1 border-b border-border',
        orientation === 'vertical' && 'flex-col border-b-0 border-r',
        className,
      )}
      onKeyDown={onKeyDown}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Props for `<Tab>`. */
export interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The value this tab controls; matched against `TabPanel.value`. */
  value: string;
}

/** Triggers for a `<Tabs>` group. */
export function Tab({
  value,
  className,
  children,
  type,
  ...rest
}: TabProps): React.ReactElement {
  const { value: active, setValue, idBase } = useTabsContext('Tab');
  const selected = active === value;
  return (
    <button
      role="tab"
      type={type ?? 'button'}
      id={`${idBase}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${idBase}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      onClick={() => setValue(value)}
      className={cn(
        'relative inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium focus-ring',
        'text-muted-foreground hover:text-foreground',
        selected && 'text-foreground',
        className,
      )}
      {...rest}
    >
      <span>{children}</span>
      {selected ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-gold"
        />
      ) : null}
    </button>
  );
}

/** Props for `<TabPanel>`. */
export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

/** Panel content revealed when its tab is active. */
export function TabPanel({
  value,
  className,
  children,
  ...rest
}: TabPanelProps): React.ReactElement | null {
  const { value: active, idBase } = useTabsContext('TabPanel');
  const selected = active === value;
  if (!selected) return null;
  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel-${value}`}
      aria-labelledby={`${idBase}-tab-${value}`}
      tabIndex={0}
      className={cn('focus-ring', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
