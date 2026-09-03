import { cn } from '../../utils/format';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  dotClass?: string;
}

export function Badge({ children, className, dot, dotClass }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} aria-hidden />}
      {children}
    </span>
  );
}
