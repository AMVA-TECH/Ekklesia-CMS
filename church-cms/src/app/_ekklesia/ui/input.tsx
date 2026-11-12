import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './utils';

const BASE_INPUT_CLASSES =
  'block w-full rounded-md border border-border bg-surface px-3 text-base ' +
  'text-foreground placeholder:text-muted-foreground ' +
  'shadow-[0_1px_0_rgb(23_23_23_/_0.02)] transition-colors ' +
  'focus:border-[color:var(--ring)] focus:outline-none focus-ring ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground ' +
  'aria-[invalid=true]:border-[color:var(--danger)] ' +
  'aria-[invalid=true]:focus:border-[color:var(--danger)]';

/** Shared input props — the browser `type` stays authoritative. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Compact height. Default is 44px touch target. */
  dense?: boolean;
}

/**
 * Standard text input. Minimum 16px font prevents iOS focus zoom.
 * Always pair with a `<Field>` label for accessibility.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { dense = false, className, type = 'text', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(BASE_INPUT_CLASSES, dense ? 'h-10' : 'h-11', className)}
      {...rest}
    />
  );
});

export { BASE_INPUT_CLASSES };
