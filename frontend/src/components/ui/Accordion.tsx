import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/format';

interface AccordionItemProps {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

export function AccordionItem({ question, answer, defaultOpen }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-ink-900 dark:text-ink-100">{question}</span>
        <ChevronDown
          className={cn('h-5 w-5 shrink-0 text-ink-400 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      <div className={cn('grid transition-all', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{answer}</p>
        </div>
      </div>
    </div>
  );
}
