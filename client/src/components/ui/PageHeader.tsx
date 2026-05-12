import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-small text-ink-muted">{eyebrow}</div>}
        <h1 className="text-display font-display text-ink">{title}</h1>
        {description && <p className="mt-1 text-body text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
