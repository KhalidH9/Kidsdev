import { cx } from '../../lib/utils';

export interface TabDef {
  key: string;
  label: string;
}

interface Props {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, active, onChange }: Props) {
  return (
    <div
      role="tablist"
      className="scroll-fade-x relative -mb-px flex gap-1 overflow-x-auto border-b border-line"
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={cx(
              'relative h-11 shrink-0 px-4 text-body font-medium transition-colors duration-fast ease-soft',
              'focus-visible:focus-ring rounded-sm',
              isActive ? 'text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
            <span
              aria-hidden
              className={cx(
                'absolute inset-x-0 -bottom-px h-0.5 transition-opacity duration-base ease-out',
                isActive ? 'bg-purple-600 opacity-100' : 'bg-purple-600 opacity-0',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
