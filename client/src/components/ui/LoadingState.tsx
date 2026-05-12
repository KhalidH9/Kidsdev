import { Loader2 } from 'lucide-react';

interface Props {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: Props) {
  return (
    <div
      className="flex items-center justify-center gap-3 rounded-md border border-line bg-white px-6 py-12 text-small text-ink-muted"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin text-purple-600" aria-hidden />
      {label}
    </div>
  );
}
