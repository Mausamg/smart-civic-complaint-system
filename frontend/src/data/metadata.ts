import type { ComplaintStatus, Priority, ComplaintCategory } from '../types';

export const statusConfig: Record<
  ComplaintStatus,
  { label: string; color: string; bg: string; text: string; border: string; dot: string; icon: string }
> = {
  submitted: {
    label: 'Submitted',
    color: 'blue',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-900',
    dot: 'bg-blue-500',
    icon: 'FileText',
  },
  under_review: {
    label: 'Under Review',
    color: 'purple',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-900',
    dot: 'bg-purple-500',
    icon: 'Eye',
  },
  assigned: {
    label: 'Assigned',
    color: 'orange',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-900',
    dot: 'bg-orange-500',
    icon: 'UserCheck',
  },
  in_progress: {
    label: 'In Progress',
    color: 'amber',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-900',
    dot: 'bg-amber-500',
    icon: 'Loader',
  },
  resolved: {
    label: 'Resolved',
    color: 'green',
    bg: 'bg-green-50 dark:bg-green-950/40',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-900',
    dot: 'bg-green-500',
    icon: 'CheckCircle2',
  },
  rejected: {
    label: 'Rejected',
    color: 'red',
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-900',
    dot: 'bg-red-500',
    icon: 'XCircle',
  },
  reopened: {
    label: 'Reopened',
    color: 'pink',
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-900',
    dot: 'bg-pink-500',
    icon: 'RotateCcw',
  },
  closed: {
    label: 'Closed',
    color: 'grey',
    bg: 'bg-ink-100 dark:bg-ink-800',
    text: 'text-ink-600 dark:text-ink-300',
    border: 'border-ink-200 dark:border-ink-700',
    dot: 'bg-ink-400',
    icon: 'Lock',
  },
};

export const priorityConfig: Record<
  Priority,
  { label: string; bg: string; text: string; border: string; icon: string }
> = {
  low: {
    label: 'Low',
    bg: 'bg-ink-100 dark:bg-ink-800',
    text: 'text-ink-600 dark:text-ink-300',
    border: 'border-ink-200 dark:border-ink-700',
    icon: 'ChevronDown',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-900',
    icon: 'Minus',
  },
  high: {
    label: 'High',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-900',
    icon: 'ChevronUp',
  },
  urgent: {
    label: 'Urgent',
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-900',
    icon: 'AlertTriangle',
  },
};

export const categoryConfig: Record<
  ComplaintCategory,
  { label: string; icon: string; color: string; bg: string; text: string; department: string }
> = {
  potholes: {
    label: 'Potholes & Roads',
    icon: 'Construction',
    color: 'amber',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    department: 'Roads & Infrastructure',
  },
  garbage: {
    label: 'Garbage & Waste',
    icon: 'Trash2',
    color: 'green',
    bg: 'bg-green-50 dark:bg-green-950/40',
    text: 'text-green-700 dark:text-green-300',
    department: 'Sanitation',
  },
  streetlights: {
    label: 'Streetlights',
    icon: 'Lightbulb',
    color: 'yellow',
    bg: 'bg-yellow-50 dark:bg-yellow-950/40',
    text: 'text-yellow-700 dark:text-yellow-300',
    department: 'Electrical',
  },
  water: {
    label: 'Water Leakage',
    icon: 'Droplets',
    color: 'sky',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    department: 'Water Supply',
  },
  drainage: {
    label: 'Drainage & Sewage',
    icon: 'Waves',
    color: 'cyan',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-300',
    department: 'Sanitation',
  },
  traffic_signals: {
    label: 'Traffic Signals',
    icon: 'TrafficCone',
    color: 'red',
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    department: 'Traffic & Transport',
  },
  property_damage: {
    label: 'Property Damage',
    icon: 'Building2',
    color: 'slate',
    bg: 'bg-slate-50 dark:bg-slate-950/40',
    text: 'text-slate-700 dark:text-slate-300',
    department: 'Public Works',
  },
  noise: {
    label: 'Noise Complaints',
    icon: 'Volume2',
    color: 'purple',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    department: 'Local Police',
  },
  illegal_construction: {
    label: 'Illegal Construction',
    icon: 'Hammer',
    color: 'rose',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    department: 'Urban Planning',
  },
  public_safety: {
    label: 'Public Safety',
    icon: 'ShieldAlert',
    color: 'indigo',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    department: 'Public Safety',
  },
  other: {
    label: 'Other Issues',
    icon: 'MoreHorizontal',
    color: 'ink',
    bg: 'bg-ink-100 dark:bg-ink-800',
    text: 'text-ink-600 dark:text-ink-300',
    department: 'General Administration',
  },
};

export const subcategories: Record<ComplaintCategory, string[]> = {
  potholes: ['Pothole', 'Cracked road surface', 'Damaged footpath', 'Missing road sign', 'Faded road markings'],
  garbage: ['Uncollected garbage', 'Overflowing bin', 'Illegal dumping', 'Recycling issue', 'Street cleaning'],
  streetlights: ['Broken streetlight', 'Flickering light', 'No streetlight', 'Damaged pole'],
  water: ['Pipe leakage', 'No water supply', 'Contaminated water', 'Low pressure', 'Broken meter'],
  drainage: ['Blocked drain', 'Overflowing sewage', 'Broken manhole cover', 'Flooded street'],
  traffic_signals: ['Signal not working', 'Incorrect timing', 'Damaged signal', 'Missing signboard'],
  property_damage: ['Damaged public building', 'Broken bench', 'Vandalised park', 'Damaged fence'],
  noise: ['Construction noise', 'Loud music', 'Industrial noise', 'Vehicle noise'],
  illegal_construction: ['Encroachment', 'No building permit', 'Unsafe structure'],
  public_safety: ['Suspicious activity', 'Stray animals', 'Poor lighting area', 'Unsafe crossing'],
  other: ['General municipal issue', 'Lost property', 'Document request'],
};

export const timelineStages = [
  { status: 'submitted' as const, label: 'Complaint Submitted', description: 'Your complaint has been received by the system.' },
  { status: 'under_review' as const, label: 'Complaint Received', description: 'The municipality is reviewing your complaint.' },
  { status: 'assigned' as const, label: 'Assigned to Department', description: 'A department and officer have been assigned.' },
  { status: 'in_progress' as const, label: 'Work in Progress', description: 'The assigned team is working on the issue.' },
  { status: 'resolved' as const, label: 'Resolution Submitted', description: 'The department has submitted a resolution.' },
  { status: 'closed' as const, label: 'Complaint Closed', description: 'The complaint has been confirmed and closed.' },
];

export const statusOptions: ComplaintStatus[] = [
  'submitted',
  'under_review',
  'assigned',
  'in_progress',
  'resolved',
  'rejected',
  'reopened',
  'closed',
];

export const priorityOptions: Priority[] = ['low', 'medium', 'high', 'urgent'];

export const categoryOptions: ComplaintCategory[] = [
  'potholes',
  'garbage',
  'streetlights',
  'water',
  'drainage',
  'traffic_signals',
  'property_damage',
  'noise',
  'illegal_construction',
  'public_safety',
  'other',
];
