import { useState, type ReactNode } from 'react';
import { cn } from '@/utils/format';

interface TabsProps {
  tabs: { id: string; label: string; icon?: ReactNode; content: ReactNode }[];
  defaultTab?: string;
  onChange?: (id: string) => void;
  variant?: 'underline' | 'pill';
}

export function Tabs({ tabs, defaultTab, onChange, variant = 'underline' }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const activeTab = tabs.find((t) => t.id === active);

  const handle = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  return (
    <div>
      <div
        className={cn(
          'flex gap-1 overflow-x-auto scrollbar-thin',
          variant === 'underline' ? 'border-b border-ink-200 dark:border-ink-800' : 'rounded-xl bg-ink-100 p-1 dark:bg-ink-800'
        )}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => handle(t.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium transition',
              variant === 'underline'
                ? cn(
                    'border-b-2 px-4 py-2.5 -mb-px',
                    active === t.id
                      ? 'border-primary-600 text-primary-700 dark:text-primary-300'
                      : 'border-transparent text-ink-500 hover:text-ink-700 dark:hover:text-ink-300'
                  )
                : cn(
                    'rounded-lg px-3.5 py-1.5',
                    active === t.id
                      ? 'bg-white text-primary-700 shadow-sm dark:bg-ink-900 dark:text-primary-300'
                      : 'text-ink-500 hover:text-ink-700'
                  )
            )}
            aria-selected={active === t.id}
            role="tab"
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4" role="tabpanel">
        {activeTab?.content}
      </div>
    </div>
  );
}
