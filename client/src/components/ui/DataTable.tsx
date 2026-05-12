import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { cx } from '../../lib/utils';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Hide on narrower viewports. */
  hideBelow?: 'sm' | 'md' | 'lg';
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyLabel?: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
  /** When provided, the entire row becomes a click target. */
  onRowClick?: (row: T) => void;
}

const hideClass: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  emptyLabel,
  emptyHint,
  emptyAction,
  onRowClick,
}: Props<T>) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-md border border-line bg-white">
        <table className="min-w-full" aria-busy>
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 text-left text-micro text-ink-muted">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className={i < 4 ? 'border-b border-line' : ''}>
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3.5">
                    <div className="skeleton h-3 w-3/4 rounded-sm" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyLabel ?? 'Nothing here yet'}
        body={emptyHint}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-white">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-line bg-white">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cx(
                  'px-4 py-3 text-left text-micro text-ink-muted',
                  c.hideBelow && hideClass[c.hideBelow],
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const clickable = !!onRowClick;
            return (
              <tr
                key={rowKey(row)}
                onClick={clickable ? () => onRowClick!(row) : undefined}
                className={cx(
                  idx < data.length - 1 && 'border-b border-line',
                  'transition-colors duration-fast ease-soft',
                  clickable && 'cursor-pointer hover:bg-purple-50',
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cx(
                      'px-4 py-3.5 align-middle text-body text-ink',
                      c.hideBelow && hideClass[c.hideBelow],
                      c.className,
                    )}
                    onClick={(e) => {
                      // Don't bubble interactive cells (buttons, links).
                      if (
                        (e.target as HTMLElement).closest('button, a, [data-row-stop]')
                      ) {
                        e.stopPropagation();
                      }
                    }}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
