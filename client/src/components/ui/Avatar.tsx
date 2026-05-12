import { cx } from '../../lib/utils';

interface Props {
  name: string;
  size?: 24 | 32 | 36 | 48 | 64;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

const sizeText: Record<NonNullable<Props['size']>, string> = {
  24: 'h-6 w-6 text-[10px]',
  32: 'h-8 w-8 text-[11px]',
  36: 'h-9 w-9 text-[12px]',
  48: 'h-12 w-12 text-[14px]',
  64: 'h-16 w-16 text-[18px]',
};

export function Avatar({ name, size = 36, className }: Props) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex items-center justify-center rounded-full bg-purple-100 font-semibold text-purple-700',
        sizeText[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
