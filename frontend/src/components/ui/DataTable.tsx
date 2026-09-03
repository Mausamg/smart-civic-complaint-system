import type { ReactNode } from 'react';
import { cn } from '@/utils/format';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'right' | 'center';
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selected?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
  allSelected?: boolean;
  emptyState?: ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selected,
  onToggleRow,
  onToggleAll,
  allSelected,
  emptyState,
  className,
}: DataTableProps<T>) {
  const hasCheckbox = !!onToggleRow;

  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50/50 dark:border-ink-800 dark:bg-ink-900/50">
              {hasCheckbox && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleAll}
                    className="h-4 w-4 rounded border-ink-300 text-primary-600 focus:ring-primary-500"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500',
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                    c.hideOnMobile && 'hidden md:table-cell',
                    c.width
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50 dark:divide-ink-800/50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasCheckbox ? 1 : 0)} className="px-4 py-12 text-center text-sm text-ink-400">
                  {emptyState || 'No records found'}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = rowKey(row);
                const isSelected = selected?.has(id);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'transition hover:bg-ink-50/70 dark:hover:bg-ink-800/40',
                      onRowClick && 'cursor-pointer',
                      isSelected && 'bg-primary-50/40 dark:bg-primary-950/20'
                    )}
                  >
                    {hasCheckbox && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleRow(id)}
                          className="h-4 w-4 rounded border-ink-300 text-primary-600 focus:ring-primary-500"
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          'px-4 py-3 text-ink-700 dark:text-ink-200',
                          c.align === 'right' && 'text-right',
                          c.align === 'center' && 'text-center',
                          c.hideOnMobile && 'hidden md:table-cell'
                        )}
                      >
                        {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
