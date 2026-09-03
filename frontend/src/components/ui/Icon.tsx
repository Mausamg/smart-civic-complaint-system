import * as Icons from 'lucide-react';

type IconMap = Record<string, Icons.LucideIcon>;
const iconMap = Icons as unknown as IconMap;

export function Icon({
  name,
  className,
  strokeWidth = 2,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Cmp = iconMap[name] ?? Icons.Circle;
  return <Cmp className={className} strokeWidth={strokeWidth} aria-hidden />;
}
