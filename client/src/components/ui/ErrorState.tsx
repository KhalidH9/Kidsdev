import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface Props {
  /** Human message — never a raw API error. */
  message?: string;
  /** Optional second line of context. */
  body?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong while loading this. Try again, or refresh the page.",
  body,
  onRetry,
}: Props) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-md border border-line bg-white px-6 py-10 text-center"
      role="alert"
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
        <AlertCircle className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-h3 text-ink">{message}</p>
      {body && <p className="max-w-[420px] text-small text-ink-muted">{body}</p>}
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
