import { forwardRef, type SelectHTMLAttributes } from 'react';
import { Icon } from '../icons';
import { BASE_INPUT_CLASSES } from './input';
import { cn } from './utils';

/** Props for `<Select>`. */
export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Compact height. */
  dense?: boolean;
}

/**
 * Native `<select>`. We keep the native control for mobile-first UX, device
 * accessibility, and i18n-safe long option lists. Styled with a chevron
 * via a background wrapper so no custom popover state is needed.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, dense = false, children, ...rest },
  ref,
) {
  return (
    <span className="relative block">
      <select
        ref={ref}
        className={cn(
          BASE_INPUT_CLASSES,
          dense ? 'h-10' : 'h-11',
          'appearance-none pr-10',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
});
