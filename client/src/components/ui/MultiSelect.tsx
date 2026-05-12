import { useId } from 'react';
import { Check } from 'lucide-react';
import { cx } from '../../lib/utils';

export interface Option {
  value: string;
  label: string;
}

interface Props {
  label?: string;
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  emptyLabel?: string;
  error?: string | null;
}

export function MultiSelect({ label, options, value, onChange, emptyLabel, error }: Props) {
  const id = useId();
  const selected = new Set(value);

  const toggle = (v: string) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(Array.from(next));
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-small font-medium text-ink">
          {label}
        </label>
      )}
      <div
        id={id}
        className={cx(
          'max-h-44 overflow-auto rounded-sm border bg-white p-1 text-body',
          error ? 'border-danger-600 bg-danger-50/30' : 'border-line-strong',
        )}
      >
        {options.length === 0 ? (
          <p className="px-3 py-2 text-small text-ink-subtle">
            {emptyLabel ?? 'No options available'}
          </p>
        ) : (
          options.map((opt) => {
            const isOn = selected.has(opt.value);
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={cx(
                  'flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-body transition-colors duration-fast ease-soft',
                  'hover:bg-purple-50 focus-visible:focus-ring',
                  isOn ? 'text-purple-700' : 'text-ink',
                )}
              >
                <span>{opt.label}</span>
                {isOn && <Check className="h-4 w-4 text-purple-600" aria-hidden />}
              </button>
            );
          })
        )}
      </div>
      {error && <p className="text-small font-medium text-danger-600">{error}</p>}
    </div>
  );
}
