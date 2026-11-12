import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from './utils';

/** Props for `<Field>` form row wrapper. */
export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  /** Visible label above the control. */
  label: ReactNode;
  /** Helper text below the control. */
  hint?: ReactNode;
  /** Error message — when present, control is marked `aria-invalid`. */
  error?: ReactNode;
  /** Shows a subtle required marker. */
  required?: boolean;
  /** Optional slot rendered right of the label (e.g. char count). */
  labelAccessory?: ReactNode;
  /**
   * Override the id passed to the control. Required when the slot contains
   * multiple inputs or a custom composite control.
   */
  htmlFor?: string;
  /** The form control to label. */
  children: ReactNode;
}

interface LabellableProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  required?: boolean;
}

/**
 * Accessible form row: label + control + hint/error.
 *
 * Auto-wires `htmlFor`, `id`, `aria-describedby`, and `aria-invalid`
 * onto the single child control. Pair with `<Input>`, `<Textarea>`,
 * `<Select>`, or any element that forwards these props.
 */
export function Field({
  label,
  hint,
  error,
  required = false,
  labelAccessory,
  htmlFor,
  id: idProp,
  className,
  children,
  ...rest
}: FieldProps): React.ReactElement {
  const reactId = useId();
  const controlId = htmlFor ?? idProp ?? `field-${reactId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const child = Children.only(children);
  const enriched = isValidElement<LabellableProps>(child)
    ? cloneElement(child as ReactElement<LabellableProps>, {
        id: child.props.id ?? controlId,
        'aria-describedby':
          [child.props['aria-describedby'], describedBy]
            .filter(Boolean)
            .join(' ') || undefined,
        'aria-invalid': error ? true : child.props['aria-invalid'],
        required: required || child.props.required,
      })
    : child;

  return (
    <div className={cn('flex flex-col gap-1.5', className)} {...rest}>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={controlId}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {required ? (
            <span
              aria-hidden="true"
              className="ml-1 text-[color:var(--brand-gold-ink)]"
            >
              *
            </span>
          ) : null}
          {required ? <span className="sr-only"> (required)</span> : null}
        </label>
        {labelAccessory ? (
          <span className="text-xs text-muted-foreground">{labelAccessory}</span>
        ) : null}
      </div>
      {enriched}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-[color:var(--danger-ink)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
