import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import { cx } from '../../lib/utils';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastInput {
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastInput {
  id: number;
  kind: ToastKind;
}

type Push = (input: ToastInput | string) => void;

interface ToastApi {
  push: (kind: ToastKind, input: ToastInput | string) => void;
  success: Push;
  error: Push;
  info: Push;
  warning: Push;
  dismiss: (id: number) => void;
}

const ToastCtx = createContext<ToastApi | undefined>(undefined);

const KIND_TIMEOUTS: Record<ToastKind, number> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
};

const KIND_META: Record<
  ToastKind,
  { stripe: string; icon: ReactNode; iconColor: string; role: 'status' | 'alert' }
> = {
  success: {
    stripe: 'bg-success-600',
    icon: <CheckCircle2 className="h-5 w-5" aria-hidden />,
    iconColor: 'text-success-600',
    role: 'status',
  },
  info: {
    stripe: 'bg-purple-600',
    icon: <Info className="h-5 w-5" aria-hidden />,
    iconColor: 'text-purple-600',
    role: 'status',
  },
  warning: {
    stripe: 'bg-warning-600',
    icon: <AlertTriangle className="h-5 w-5" aria-hidden />,
    iconColor: 'text-warning-600',
    role: 'status',
  },
  error: {
    stripe: 'bg-danger-600',
    icon: <AlertCircle className="h-5 w-5" aria-hidden />,
    iconColor: 'text-danger-600',
    role: 'alert',
  },
};

function normalize(input: ToastInput | string): ToastInput {
  return typeof input === 'string' ? { title: input } : input;
}

const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (id: number, kind: ToastKind) => {
      const t = setTimeout(() => dismiss(id), KIND_TIMEOUTS[kind]);
      timers.current.set(id, t);
    },
    [dismiss],
  );

  const push = useCallback(
    (kind: ToastKind, input: ToastInput | string) => {
      const data = normalize(input);
      const id = Date.now() + Math.random();
      setItems((prev) => [{ id, kind, ...data }, ...prev].slice(0, MAX_VISIBLE * 2));
      scheduleDismiss(id, kind);
    },
    [scheduleDismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (i) => push('success', i),
      error: (i) => push('error', i),
      info: (i) => push('info', i),
      warning: (i) => push('warning', i),
      dismiss,
    }),
    [push, dismiss],
  );

  const pauseOnHover = (id: number) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  };
  const resumeOnLeave = (id: number, kind: ToastKind) => scheduleDismiss(id, kind);

  const visible = items.slice(0, MAX_VISIBLE);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {/* Desktop top-right; mobile pinned bottom edge */}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col gap-2 sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:w-[360px]"
        aria-live="polite"
      >
        {visible.map((t) => {
          const meta = KIND_META[t.kind];
          return (
            <div
              key={t.id}
              role={meta.role}
              onMouseEnter={() => pauseOnHover(t.id)}
              onMouseLeave={() => resumeOnLeave(t.id, t.kind)}
              className={cx(
                'pointer-events-auto relative overflow-hidden rounded-md border border-line bg-white shadow-toast',
                'animate-toast-in',
              )}
            >
              <span className={cx('absolute inset-y-0 left-0 w-[3px]', meta.stripe)} />
              <div className="flex items-start gap-3 px-4 py-3.5 pl-5">
                <span className={cx('mt-0.5 shrink-0', meta.iconColor)}>{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-ink">{t.title}</p>
                  {t.body && (
                    <p className="mt-0.5 line-clamp-2 text-small text-ink-muted">{t.body}</p>
                  )}
                  {t.action && (
                    <button
                      onClick={() => {
                        t.action!.onClick();
                        dismiss(t.id);
                      }}
                      className="mt-2 text-small font-medium text-purple-600 underline-offset-2 hover:underline focus-visible:focus-ring rounded-sm"
                    >
                      {t.action.label}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="shrink-0 rounded-sm p-1 text-ink-muted hover:bg-purple-50 hover:text-purple-700 focus-visible:focus-ring"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
