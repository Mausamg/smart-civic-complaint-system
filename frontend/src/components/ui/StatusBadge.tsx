import * as Icons from 'lucide-react';
import { statusConfig, priorityConfig, categoryConfig } from '../../data/metadata';
import type { ComplaintStatus, Priority, ComplaintCategory } from '../../types';
import { Badge } from './Badge';
import { cn } from '../../utils/format';

type IconMap = Record<string, Icons.LucideIcon>;
const iconMap = Icons as unknown as IconMap;

export function StatusBadge({ status, size = 'md' }: { status: ComplaintStatus; size?: 'sm' | 'md' }) {
  const cfg = statusConfig[status];
  const Icon = iconMap[cfg.icon] ?? Icons.Circle;
  return (
    <Badge
      dot
      dotClass={cfg.dot}
      className={cn(cfg.bg, cfg.text, cfg.border, size === 'sm' ? 'text-[10px] px-2 py-0' : '')}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>{cfg.label}</span>
      <span className="sr-only">Status: {cfg.label}</span>
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = priorityConfig[priority];
  const Icon = iconMap[cfg.icon] ?? Icons.Circle;
  return (
    <Badge className={cn(cfg.bg, cfg.text, cfg.border)}>
      <Icon className="h-3 w-3" aria-hidden />
      {cfg.label}
      <span className="sr-only">Priority: {cfg.label}</span>
    </Badge>
  );
}

export function CategoryBadge({ category, withIcon = true }: { category: ComplaintCategory; withIcon?: boolean }) {
  const cfg = categoryConfig[category];
  const Icon = iconMap[cfg.icon] ?? Icons.Circle;
  return (
    <Badge className={cn(cfg.bg, cfg.text, 'border-transparent')}>
      {withIcon && <Icon className="h-3 w-3" aria-hidden />}
      {cfg.label}
    </Badge>
  );
}
