import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cx } from '../../lib/utils';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { label, error, hint, className, id, rows = 4, required, ...rest },
  ref,
) {
  const autoId = useId();
  const taId = id ?? rest.name ?? autoId;
  const describedById = error || hint ? `${taId}-desc` : undefined;
  const hasError = !!error;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={taId} className="text-small font-medium text-ink">
          {label}
          {required && <span className="text-danger-600"> *</span>}
        </label>
      )}
      <textarea
        id={taId}
        ref={ref}
        rows={rows}
        aria-invalid={hasError || undefined}
        aria-required={required || undefined}
        aria-describedby={describedById}
        required={required}
        {...rest}
        className={cx(
          'rounded-sm border bg-white px-3.5 py-3 text-body text-ink',
          'placeholder:text-ink-subtle resize-y',
          'transition-colors duration-fast ease-soft',
          'focus:outline-none focus:ring-2 focus:ring-purple-200',
          hasError
            ? 'border-danger-600 bg-danger-50/30 focus:border-danger-600'
            : 'border-line-strong focus:border-purple-600',
          'disabled:bg-surface-sunken disabled:text-ink-subtle disabled:border-line',
          className,
        )}
      />
      {(error || hint) && (
        <p
          id={describedById}
          className={cx(
            'text-small',
            hasError ? 'text-danger-600 font-medium' : 'text-ink-muted',
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
