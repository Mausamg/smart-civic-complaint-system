import { formatDistanceToNow, format } from 'date-fns';

export const timeAgo = (iso: string): string => {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '—';
  }
};

export const formatDate = (iso: string, fmt = 'dd MMM yyyy'): string => {
  try {
    return format(new Date(iso), fmt);
  } catch {
    return '—';
  }
};

export const formatDateTime = (iso: string): string => formatDate(iso, 'dd MMM yyyy, h:mm a');

export const formatNumber = (n: number): string => n.toLocaleString('en-US');

export const cn = (...classes: (string | false | undefined | null)[]): string =>
  classes.filter(Boolean).join(' ');

export const initials = (name: string): string =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
