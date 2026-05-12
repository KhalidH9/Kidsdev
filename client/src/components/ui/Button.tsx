import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  children?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 disabled:bg-purple-600/50',
  secondary:
    'bg-white text-ink border border-line-strong hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 active:bg-purple-100 disabled:text-ink/40 disabled:border-line-strong/50 disabled:bg-white',
  ghost:
    'bg-transparent text-ink hover:bg-purple-50 hover:text-purple-700 active:bg-purple-100 disabled:text-ink/40',
  danger:
    'bg-danger-600 text-white hover:bg-[#A92020] active:bg-[#8C1A1A] disabled:bg-danger-600/50',
  'danger-ghost':
    'bg-transparent text-danger-600 hover:bg-danger-50 active:bg-[#F8D5D5] disabled:text-danger-600/40',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-small font-medium min-w-9 gap-2',
  md: 'h-11 px-4 text-body font-medium min-w-11 gap-2',
  lg: 'h-[52px] px-5 text-body font-medium min-w-[52px] gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  iconStart,
  iconEnd,
  className,
  disabled,
  children,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center rounded-md transition-colors duration-fast ease-soft',
        'focus-visible:focus-ring disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
      ) : (
        iconStart && <span className="inline-flex shrink-0">{iconStart}</span>
      )}
      {children}
      {!loading && iconEnd && <span className="inline-flex shrink-0">{iconEnd}</span>}
    </button>
  );
}
