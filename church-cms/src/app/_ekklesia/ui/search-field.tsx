'use client';

import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { Icon } from '../icons';
import { cn } from './utils';

/** Props for `<SearchField>`. */
export interface SearchFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Accessible label — defaults to "Search". Shown as placeholder if `placeholder` omitted. */
  label?: string;
  /** Compact height. */
  dense?: boolean;
  /** Called when the user clicks the clear button. */
  onClear?: () => void;
}

/**
 * Accessible search input with an inline leading icon.
 *
 * Renders a visually hidden `<label>` paired to the input, so screen readers
 * get context without crowding the chrome.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(
    { label = 'Search', placeholder, dense = false, className, id, onClear, value, ...rest },
    ref,
  ) {
    const reactId = useId();
    const inputId = id ?? `search-${reactId}`;
    const hasValue = value !== undefined && value !== '';
    return (
      <div className={cn('relative block w-full', className)}>
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
        <Icon
          name="search"
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={inputId}
          ref={ref}
          type="search"
          value={value}
          placeholder={placeholder ?? label}
          className={cn(
            'block w-full rounded-md border border-border bg-surface pl-9 pr-9 text-base',
            dense ? 'h-10' : 'h-11',
            'text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:border-[color:var(--ring)] focus-ring',
            'disabled:cursor-not-allowed disabled:bg-surface-muted',
          )}
          {...rest}
        />
        {hasValue && onClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-ring"
          >
            <Icon name="close" size={14} />
          </button>
        ) : null}
      </div>
    );
  },
);
