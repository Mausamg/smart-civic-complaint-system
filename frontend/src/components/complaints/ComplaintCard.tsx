import { Link } from 'react-router-dom';
import { MapPin, Clock, Building2, MessageSquare } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/StatusBadge';
import { CategoryBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { timeAgo, formatDate } from '@/utils/format';
import type { Complaint } from '@/types';

interface ComplaintCardProps {
  complaint: Complaint;
  linkTo: string;
  showCitizen?: boolean;
  showComments?: boolean;
}

export function ComplaintCard({ complaint, linkTo, showCitizen, showComments }: ComplaintCardProps) {
  return (
    <Link to={linkTo} className="block focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-2xl">
      <Card hover className="h-full">
        <div className="flex items-start justify-between gap-2 p-4">
          <div className="flex items-center gap-2">
            <CategoryBadge category={complaint.category} />
          </div>
          <StatusBadge status={complaint.status} size="sm" />
        </div>
        <div className="px-4 pb-1">
          <p className="text-xs font-medium text-ink-400">{complaint.trackingId}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-ink-900 dark:text-ink-100">{complaint.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-ink-500">{complaint.description}</p>
        </div>
        <div className="space-y-1.5 px-4 py-3 text-xs text-ink-500">
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-400" />
            <span className="truncate">{complaint.address}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-ink-400" /> {complaint.assignedDepartment}
            </p>
            <p className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-ink-400" /> {formatDate(complaint.submittedAt)}
            </p>
            {showComments && (
              <p className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-ink-400" /> {complaint.comments.length}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-ink-100 px-4 py-2.5 dark:border-ink-800">
          <PriorityBadge priority={complaint.priority} />
          {showCitizen && (
            <span className="text-xs text-ink-500">
              {complaint.isAnonymous ? 'Anonymous' : complaint.citizen.name}
            </span>
          )}
          {!showCitizen && <span className="text-[11px] text-ink-400">Updated {timeAgo(complaint.lastUpdate)}</span>}
        </div>
      </Card>
    </Link>
  );
}
