import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { BASE_INPUT_CLASSES } from './input';
import { cn } from './utils';

/** Props for `<Textarea>`. */
export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * Multi-line text input. Auto-resizes with `field-sizing: content` where
 * supported; otherwise respects the `rows` attribute.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          BASE_INPUT_CLASSES,
          'min-h-[6rem] py-2.5 [field-sizing:content] resize-y',
          className,
        )}
        {...rest}
      />
    );
  },
);
