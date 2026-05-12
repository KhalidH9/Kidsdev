import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from '../../lib/utils';

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: Size;
  /**
   * When true, ESC and backdrop click are disabled. Used for confirm dialogs
   * mid-action and any destructive flow that should require explicit choice.
   */
  blocking?: boolean;
}

const sizeMap: Record<Size, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[880px]',
};

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
  blocking,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // ESC handling + focus management.
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !blocking) {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab') {
        // Simple focus trap: keep tab within the panel.
        const root = panelRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    // Initial focus inside panel.
    queueMicrotask(() => {
      const root = panelRef.current;
      const first = root?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      first?.focus();
    });
    return () => {
      window.removeEventListener('keydown', onKey);
      openerRef.current?.focus?.();
    };
  }, [open, onClose, blocking]);

  // Lock body scroll while modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[4px] animate-fade-in"
      onMouseDown={(e) => {
        if (blocking) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'w-full overflow-hidden rounded-lg bg-white shadow-raised animate-pop-in',
          'max-h-[min(90vh,720px)] flex flex-col',
          sizeMap[size],
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <h2 className="text-h2 text-ink">{title}</h2>
          {!blocking && (
            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-purple-50 hover:text-purple-700 focus-visible:focus-ring"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          )}
        </header>
        <div className="flex-1 overflow-auto px-6 py-6">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
