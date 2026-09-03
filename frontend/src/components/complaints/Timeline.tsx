import { Check } from 'lucide-react';
import { cn } from '@/utils/format';
import { statusConfig } from '@/data/metadata';
import { formatDateTime } from '@/utils/format';
import type { TimelineEvent, ComplaintStatus } from '@/types';

export function Timeline({ events, stages }: { events: TimelineEvent[]; stages?: { status: ComplaintStatus; label: string; description: string }[] }) {
  const stageList = stages ?? [
    { status: 'submitted' as const, label: 'Complaint Submitted', description: 'Reported by citizen.' },
    { status: 'under_review' as const, label: 'Complaint Received', description: 'Under municipal review.' },
    { status: 'assigned' as const, label: 'Assigned to Department', description: 'Department & officer assigned.' },
    { status: 'in_progress' as const, label: 'Work in Progress', description: 'Resolution work started.' },
    { status: 'resolved' as const, label: 'Resolution Submitted', description: 'Department submitted resolution.' },
    { status: 'closed' as const, label: 'Complaint Closed', description: 'Confirmed and closed.' },
  ];

  const reachedStatuses = new Set(events.map((e) => e.status));
  const rejected = events.some((e) => e.status === 'rejected');
  const reopened = events.some((e) => e.status === 'reopened');

  return (
    <ol className="relative ml-3 space-y-5 border-l-2 border-ink-100 pl-6 dark:border-ink-800">
      {stageList.map((stage, idx) => {
        const event = events.find((e) => e.status === stage.status);
        const completed = event?.completed ?? reachedStatuses.has(stage.status);
        const cfg = statusConfig[stage.status];
        const isLast = idx === stageList.length - 1;
        return (
          <li key={stage.status} className="relative">
            <span
              className={cn(
                'absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2',
                completed ? `${cfg.dot} border-white text-white` : 'border-ink-200 bg-white text-ink-300 dark:border-ink-700 dark:bg-ink-900'
              )}
            >
              {completed ? <Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
            </span>
            <div className={cn(!completed && 'opacity-60')}>
              <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{stage.label}</p>
              <p className="mt-0.5 text-xs text-ink-500">{event?.description ?? stage.description}</p>
              {event && (
                <p className="mt-1 text-[11px] text-ink-400">
                  {formatDateTime(event.timestamp)} · {event.actor}
                </p>
              )}
            </div>
            {isLast && rejected && (
              <div className="mt-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-xs text-error-700">
                This complaint was rejected. See details in the comments.
              </div>
            )}
            {isLast && reopened && !rejected && (
              <div className="mt-2 rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-xs text-pink-700">
                This complaint was reopened by the citizen.
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
