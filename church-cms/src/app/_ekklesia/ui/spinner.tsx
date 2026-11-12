import type { HTMLAttributes } from 'react';
import { Icon } from '../icons';
import { cn } from './utils';

/** Props for `<Spinner>`. */
export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Accessible label, announced to screen readers. Default "Loading…". */
  label?: string;
}

const SIZE_PX: Record<NonNullable<SpinnerProps['size']>, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 28,
};

/** Rotating loader glyph. Spin honours `prefers-reduced-motion` via Tailwind. */
export function Spinner({
  size = 'sm',
  label = 'Loading…',
  className,
  ...rest
}: SpinnerProps): React.ReactElement {
  return (
    <span
      role="status"
      className={cn('inline-flex items-center justify-center text-muted-foreground', className)}
      {...rest}
    >
      <Icon
        name="loader"
        size={SIZE_PX[size]}
        className="animate-spin motion-reduce:animate-none"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
