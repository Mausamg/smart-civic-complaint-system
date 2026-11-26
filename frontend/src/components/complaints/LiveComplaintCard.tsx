import {
  ArrowUpRight,
  Building2,
  Clock,
  MapPin,
  Users,
} from 'lucide-react';

import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn, formatDate, timeAgo } from '@/utils/format';

export interface LiveComplaintSummaryData {
  id: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  location: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string | null;
  departmentLabel?: string;
  municipalityLabel?: string;
  assignmentLabel?: string;
}

const neutralStyle =
  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

function readableValue(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) ||
    'Unknown';
}

function normalizedValue(value: string): string {
  return value.replace(/[^a-z]/gi, '').toLowerCase();
}

function statusStyle(value: string): string {
  switch (normalizedValue(value)) {
    case 'submitted':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';

    case 'underreview':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300';

    case 'inprogress':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';

    case 'resolved':
      return 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300';

    case 'rejected':
      return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';

    case 'withdrawn':
    default:
      return neutralStyle;
  }
}

function priorityStyle(value: string): string {
  switch (normalizedValue(value)) {
    case 'medium':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';

    case 'high':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';

    case 'critical':
    case 'urgent':
      return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';

    case 'low':
    default:
      return neutralStyle;
  }
}

export function LiveComplaintStatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <Badge
      className={cn(
        'border-transparent font-semibold',
        statusStyle(status)
      )}
    >
      <span className="sr-only">Status: </span>
      {readableValue(status)}
    </Badge>
  );
}

export function LiveComplaintPriorityBadge({
  priority,
}: {
  priority: string;
}) {
  return (
    <Badge
      className={cn(
        'border-transparent font-semibold',
        priorityStyle(priority)
      )}
    >
      <span className="sr-only">Priority: </span>
      {readableValue(priority)}
    </Badge>
  );
}

export function LiveComplaintCategoryBadge({
  category,
}: {
  category: string;
}) {
  return (
    <Badge className="max-w-full border-transparent bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
      <span className="break-words">
        {readableValue(category)}
      </span>
    </Badge>
  );
}

interface SummaryProps {
  complaint: LiveComplaintSummaryData;
  compact?: boolean;
}

export function LiveComplaintSummary({
  complaint,
  compact = false,
}: SummaryProps) {
  return (
    <span className="block min-w-0 space-y-2">
      <span className="flex flex-wrap items-center gap-2">
        <LiveComplaintCategoryBadge
          category={complaint.category}
        />

        <LiveComplaintStatusBadge
          status={complaint.status}
        />
      </span>

      {!compact && (
        <span
          title={complaint.id}
          className="block text-xs font-medium text-ink-400"
        >
          ID: {complaint.id.slice(0, 8)}
        </span>
      )}

      <span
        className={cn(
          'block break-words text-sm font-semibold text-ink-900 dark:text-ink-100',
          !compact && 'line-clamp-2'
        )}
      >
        {complaint.title}
      </span>

      {!compact && complaint.description && (
        <span className="block line-clamp-2 break-words text-xs text-ink-500">
          {complaint.description}
        </span>
      )}

      <span className="block space-y-1.5 text-xs text-ink-600 dark:text-ink-300">
        <span className="flex items-start gap-2">
          <MapPin
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400"
          />

          <span className="min-w-0 break-words">
            {complaint.location ||
              'Location description unavailable'}
          </span>
        </span>

        {!compact && complaint.createdAt && (
          <span className="flex items-center gap-2">
            <Clock
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 text-ink-400"
            />

            <span>
              Submitted {formatDate(complaint.createdAt)}
            </span>
          </span>
        )}

        {complaint.departmentLabel !== undefined && (
          <span className="flex items-start gap-2">
            <Building2
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400"
            />

            <span className="min-w-0 break-words">
              Department: {complaint.departmentLabel}
            </span>
          </span>
        )}

        {complaint.municipalityLabel !== undefined &&
          complaint.municipalityLabel !== complaint.location && (
            <span className="block break-words">
              Municipality: {complaint.municipalityLabel}
            </span>
          )}

        {complaint.assignmentLabel !== undefined && (
          <span className="flex items-center gap-2">
            <Users
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 text-ink-400"
            />

            <span>
              Staff: {complaint.assignmentLabel}
            </span>
          </span>
        )}
      </span>
    </span>
  );
}

function DetailsActionContent() {
  return (
    <span className="inline-flex items-center gap-1">
      View details

      <ArrowUpRight
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0"
      />
    </span>
  );
}

export function LiveComplaintDetailsLink({
  to,
  title,
}: {
  to: string;
  title: string;
}) {
  return (
    <Link
      to={to}
      aria-label={`View details: ${title}`}
      className="rounded text-xs font-semibold text-primary-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:text-primary-300"
    >
      <DetailsActionContent />
    </Link>
  );
}

type RegularCardProps = {
  complaint: LiveComplaintSummaryData;
  detailsTo: string;
  variant?: 'regular';
};

type CompactCardProps = {
  complaint: LiveComplaintSummaryData;
  detailsTo: string;
  variant: 'compact';
  selected: boolean;
  onSelectLocation: () => void;
  locationUnavailable?: boolean;
};

type LiveComplaintCardProps =
  | RegularCardProps
  | CompactCardProps;

export function LiveComplaintCard(
  props: LiveComplaintCardProps
) {
  const { complaint, detailsTo } = props;

  if (props.variant === 'compact') {
    return (
      <Card
        className={cn(
          'overflow-hidden',
          props.selected &&
            'border-amber-500 bg-amber-50 ring-1 ring-amber-400 dark:bg-amber-950/20'
        )}
      >
        <button
          type="button"
          aria-pressed={props.selected}
          aria-label={`Show ${complaint.title} on map`}
          onClick={props.onSelectLocation}
          disabled={props.locationUnavailable}
          className="block w-full p-3 text-left transition-colors hover:bg-ink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 disabled:cursor-default dark:hover:bg-ink-800/50 motion-reduce:transition-none"
        >
          <LiveComplaintSummary
            complaint={complaint}
            compact
          />

          {props.locationUnavailable && (
            <span className="mt-2 block text-xs text-ink-500">
              No valid map location available.
            </span>
          )}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 px-3 py-2.5 dark:border-ink-800">
          <LiveComplaintPriorityBadge
            priority={complaint.priority}
          />

          <LiveComplaintDetailsLink
            to={detailsTo}
            title={complaint.title}
          />
        </div>
      </Card>
    );
  }

  const lastUpdate =
    complaint.updatedAt ?? complaint.createdAt;

  return (
    <Link
      to={detailsTo}
      aria-label={`View details: ${complaint.title}`}
      className="group block h-full rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
    >
      <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:border-primary-300 group-hover:shadow-lg dark:group-hover:border-primary-700 motion-reduce:transition-none">
        <div className="flex-1 p-4">
          <LiveComplaintSummary complaint={complaint} />

          {lastUpdate && (
            <p className="mt-3 text-[11px] text-ink-400">
              Updated {timeAgo(lastUpdate)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 px-4 py-3 dark:border-ink-800">
          <LiveComplaintPriorityBadge
            priority={complaint.priority}
          />

          <span className="text-xs font-semibold text-primary-700 group-hover:underline dark:text-primary-300">
            <DetailsActionContent />
          </span>
        </div>
      </Card>
    </Link>
  );
}
