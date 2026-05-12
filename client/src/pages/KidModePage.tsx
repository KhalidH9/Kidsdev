import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import type { ChildDto, KidModeSessionDto } from '@kids/shared';
import { api } from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { LoadingState } from '../components/ui/LoadingState';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { firstName } from '../lib/utils';
import { messageFor } from '../lib/errors';

const HOLD_DURATION_MS = 800;

/**
 * Kid Mode safe-screen.
 *
 *  - No clinical data, logs, goals, reinforcements, notes, reports, or parent data.
 *  - Close requires press-and-hold (defends against accidental child taps).
 *  - The breathing-circle animation respects prefers-reduced-motion.
 */
export function KidModePage() {
  const { childId = '' } = useParams<{ childId: string }>();
  const { role } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const [confirmingClose, setConfirmingClose] = useState(false);

  // Parents must never see Kid Mode.
  useEffect(() => {
    if (role === 'parent') navigate('/', { replace: true });
  }, [role, navigate]);

  const childQ = useQuery({
    queryKey: ['kid-mode-child', childId],
    queryFn: () => api.get<ChildDto>(`/children/${childId}`),
    enabled: !!childId,
  });

  const sessionQ = useQuery({
    queryKey: ['kid-mode', childId],
    queryFn: () =>
      api.get<{ session: KidModeSessionDto | null }>(`/kid-mode/child/${childId}`),
    enabled: !!childId,
  });

  const closeMut = useMutation({
    mutationFn: (id: string) => api.post<KidModeSessionDto>(`/kid-mode/${id}/close`),
    onSuccess: () => {
      toast.success({ title: t('kidMode.sessionEnded') });
      qc.invalidateQueries({ queryKey: ['kid-mode', childId] });
      navigate(`/children/${childId}`);
    },
    onError: (e) =>
      toast.error({ title: t('kidMode.sessionError'), body: messageFor(e) }),
  });

  if (role === 'parent') return null;
  if (childQ.isLoading || sessionQ.isLoading) return <LoadingState />;
  if (childQ.error) {
    return (
      <ErrorState message={messageFor(childQ.error)} onRetry={() => childQ.refetch()} />
    );
  }
  const session = sessionQ.data?.session;
  const child = childQ.data;
  const first = firstName(child?.name);

  if (!session) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-white p-6 text-center">
        <div className="space-y-4">
          <h1 className="text-h2 text-ink">
            {t('kidMode.notOpen', { name: child?.name ?? '—' })}
          </h1>
          <p className="text-body text-ink-muted">{t('kidMode.openFromProfile')}</p>
          <Button onClick={() => navigate(`/children/${childId}`)}>
            {t('kidMode.backToProfile', { name: first })}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        background:
          'linear-gradient(180deg, #FDF7FF 0%, #F5F1FE 50%, #FFF8E7 100%)',
      }}
    >
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <BreathingCircle />
        <h1 className="mt-10 text-[36px] leading-[44px] font-semibold text-ink">
          {t('kidMode.hi', { name: first })}
        </h1>
      </main>

      <footer className="flex items-center justify-between gap-4 bg-white/60 px-4 py-3 backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 text-micro text-ink-muted">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          {t('kidMode.adultOnly')}
        </span>
        <PressAndHoldButton
          label={t('kidMode.closeKidMode')}
          holdingLabel={t('kidMode.keepHolding')}
          onComplete={() => setConfirmingClose(true)}
        />
      </footer>

      <ConfirmDialog
        open={confirmingClose}
        title={t('kidMode.endSession')}
        message={t('kidMode.endSessionMsg', { name: first })}
        confirmLabel={t('kidMode.endConfirm')}
        loading={closeMut.isPending}
        onCancel={() => setConfirmingClose(false)}
        onConfirm={() => closeMut.mutate(session.id)}
      />
    </div>
  );
}

function BreathingCircle() {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <div
      aria-hidden
      className={
        reduced
          ? 'h-[280px] w-[280px] rounded-full bg-purple-100'
          : 'h-[280px] w-[280px] rounded-full bg-purple-100 animate-breathe'
      }
    />
  );
}

/**
 * Button that must be pressed and held for HOLD_DURATION_MS before triggering.
 */
function PressAndHoldButton({
  label,
  holdingLabel,
  onComplete,
}: {
  label: string;
  holdingLabel: string;
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0); // 0..100
  const rafRef = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const completedRef = useRef(false);

  const stop = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startedAt.current = null;
    setProgress(0);
    completedRef.current = false;
  };

  const tick = (now: number) => {
    if (startedAt.current == null) return;
    const elapsed = now - startedAt.current;
    const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
    setProgress(pct);
    if (pct >= 100) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      stop();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const start = () => {
    if (rafRef.current != null) return;
    startedAt.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  return (
    <button
      type="button"
      aria-label="Press and hold to close Kid Mode"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') start();
      }}
      onKeyUp={stop}
      className="relative inline-flex h-11 min-w-[180px] items-center justify-center overflow-hidden rounded-md border border-line-strong bg-white px-4 text-body font-medium text-ink transition-colors duration-fast ease-soft focus-visible:focus-ring"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 start-0 bg-purple-100 transition-[width] duration-fast ease-soft"
        style={{ width: `${progress}%` }}
      />
      <span className="relative">
        {progress > 0 && progress < 100 ? holdingLabel : label}
      </span>
    </button>
  );
}
