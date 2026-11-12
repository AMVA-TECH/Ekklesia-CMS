import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from '../icons';
import { cn } from './utils';

/** Visual variants for `<Button>`. */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'gold';

/** Size scale for `<Button>`. */
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap ' +
  'rounded-md transition-colors focus-ring ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  'motion-reduce:transition-none';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // Charcoal at rest; champagne gold on hover/press (charcoal label on gold).
  primary:
    'bg-primary text-primary-foreground hover:bg-brand-gold hover:text-accent-foreground active:bg-brand-gold-strong active:text-accent-foreground',
  secondary:
    'bg-surface text-foreground border border-border hover:border-brand-gold-soft hover:bg-brand-gold-tint active:bg-brand-gold-tint',
  ghost:
    'bg-transparent text-foreground hover:bg-brand-gold-tint hover:text-[color:var(--brand-gold-ink)] active:bg-brand-gold-soft',
  destructive:
    'bg-danger text-primary-foreground hover:bg-danger-ink',
  gold:
    'bg-brand-gold text-foreground hover:bg-brand-gold-strong active:bg-brand-gold-strong',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

/** Props for `<Button>`. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional leading icon. */
  iconLeft?: IconName;
  /** Optional trailing icon. */
  iconRight?: IconName;
  /** When true, renders a spinner and disables the button. */
  loading?: boolean;
  /** Full-width (block) button. */
  block?: boolean;
  children?: ReactNode;
}

/**
 * Standard Ekklesia button.
 *
 * Charcoal leads at rest; champagne gold on hover/press for primary actions.
 * Use `gold` sparingly for always-on gold CTAs.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    iconLeft,
    iconRight,
    loading = false,
    block = false,
    disabled,
    className,
    type,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const iconSize = size === 'lg' ? 18 : 16;
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(
        BASE_CLASSES,
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        block && 'w-full',
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Icon name="loader" size={iconSize} className="animate-spin" />
      ) : iconLeft ? (
        <Icon name={iconLeft} size={iconSize} />
      ) : null}
      {children ? <span className="truncate">{children}</span> : null}
      {!loading && iconRight ? <Icon name={iconRight} size={iconSize} /> : null}
    </button>
  );
});

/** Non-visual helper for custom `<a>`/`<Link>` elements that should look like a button. */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
} = {}): string {
  return cn(
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    block && 'w-full',
    className,
  );
}
