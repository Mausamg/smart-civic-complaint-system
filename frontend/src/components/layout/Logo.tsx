import { ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/format';

export function Logo({ className, showText = true, size = 'md' }: { className?: string; showText?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const iconSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="flex items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 text-white shadow-sm">
        <ShieldCheck className={cn(iconSize, 'p-1.5')} strokeWidth={2.2} />
      </span>
      {showText && (
        <span className={cn('font-bold tracking-tight text-ink-900 dark:text-ink-100', textSize)}>
          Civic<span className="text-primary-600">Link</span>
        </span>
      )}
    </span>
  );
}
