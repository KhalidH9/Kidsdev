import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cx } from '../../lib/utils';

export interface KebabAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  danger?: boolean;
}

interface Props {
  actions: KebabAction[];
  label?: string;
}

export function KebabMenu({ actions, label = 'More actions' }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative inline-flex" data-row-stop>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-purple-50 hover:text-purple-700 focus-visible:focus-ring"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-md border border-line bg-white shadow-raised animate-pop-in"
        >
          {actions.map((a, i) => (
            <button
              key={i}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
              className={cx(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-body transition-colors duration-fast ease-soft',
                a.danger
                  ? 'text-danger-600 hover:bg-danger-50'
                  : 'text-ink hover:bg-purple-50 hover:text-purple-700',
              )}
            >
              {a.icon && <span className="shrink-0">{a.icon}</span>}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
