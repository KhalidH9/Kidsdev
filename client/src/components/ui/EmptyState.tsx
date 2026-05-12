import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, body, icon, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-line bg-white px-6 py-12 text-center">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-purple-600">
        {icon ?? <Sparkles className="h-6 w-6" aria-hidden />}
      </span>
      <h3 className="text-h3 text-ink">{title}</h3>
      {body && <p className="mt-1 max-w-[360px] text-small text-ink-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
