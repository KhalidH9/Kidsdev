import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';

interface Props {
  open: boolean;
  title: string;
  message: string;
  /** Verb-specific label, e.g. "Archive Liam", "End session". */
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ARM_TIMEOUT_MS = 3000;

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation();

  // Destructive confirms require a deliberate double-tap. First click arms the
  // button ("Tap again to …"); a second click within ARM_TIMEOUT_MS fires it.
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setArmed(false);
      if (armTimer.current) clearTimeout(armTimer.current);
    }
  }, [open]);

  const handlePrimary = () => {
    if (!destructive) {
      onConfirm();
      return;
    }
    if (armed) {
      if (armTimer.current) clearTimeout(armTimer.current);
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    armTimer.current = setTimeout(() => setArmed(false), ARM_TIMEOUT_MS);
  };

  const armedLabel = t('common.tapAgainTo', { action: confirmLabel.toLowerCase() });

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      blocking={loading}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={handlePrimary}
            loading={loading}
          >
            {destructive && armed ? armedLabel : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {destructive && (
          <span
            className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center text-danger-600"
            aria-hidden
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
        )}
        <p className="text-body text-ink">{message}</p>
      </div>
    </Modal>
  );
}
