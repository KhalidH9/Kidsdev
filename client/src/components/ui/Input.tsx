import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../lib/utils';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, iconStart, iconEnd, className, id, required, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? rest.name ?? autoId;
  const describedById = error || hint ? `${inputId}-desc` : undefined;
  const hasError = !!error;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-small font-medium text-ink">
          {label}
          {required && <span className="text-danger-600"> *</span>}
        </label>
      )}
      <div className="relative">
        {iconStart && (
          <span className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
            {iconStart}
          </span>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={hasError || undefined}
          aria-required={required || undefined}
          aria-describedby={describedById}
          required={required}
          {...rest}
          className={cx(
            'h-11 w-full rounded-sm border bg-white px-3.5 text-body text-ink',
            'placeholder:text-ink-subtle',
            'transition-colors duration-fast ease-soft',
            'focus:outline-none focus:ring-2 focus:ring-purple-200',
            iconStart ? 'ps-10' : null,
            iconEnd ? 'pe-10' : null,
            hasError
              ? 'border-danger-600 bg-danger-50/30 focus:border-danger-600 focus:ring-danger-600/20'
              : 'border-line-strong focus:border-purple-600',
            'disabled:bg-surface-sunken disabled:text-ink-subtle disabled:border-line',
            className,
          )}
        />
        {iconEnd && (
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-ink-muted">
            {iconEnd}
          </span>
        )}
      </div>
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
