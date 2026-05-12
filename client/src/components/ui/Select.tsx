import { forwardRef, useId, type SelectHTMLAttributes, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '../../lib/utils';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, error, hint, className, id, required, children, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? rest.name ?? autoId;
  const describedById = error || hint ? `${selectId}-desc` : undefined;
  const hasError = !!error;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-small font-medium text-ink">
          {label}
          {required && <span className="text-danger-600"> *</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          ref={ref}
          aria-invalid={hasError || undefined}
          aria-required={required || undefined}
          aria-describedby={describedById}
          required={required}
          {...rest}
          className={cx(
            'h-11 w-full appearance-none rounded-sm border bg-white px-3.5 pr-10 text-body text-ink',
            'transition-colors duration-fast ease-soft',
            'focus:outline-none focus:ring-2 focus:ring-purple-200',
            hasError
              ? 'border-danger-600 bg-danger-50/30 focus:border-danger-600'
              : 'border-line-strong focus:border-purple-600',
            'disabled:bg-surface-sunken disabled:text-ink-subtle disabled:border-line',
            className,
          )}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden
        />
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
