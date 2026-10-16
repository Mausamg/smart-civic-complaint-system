import {Link} from 'react-router-dom';
import {Card} from '@/components/ui/Card';
import type {ComplaintApiResponse} from '@/services/complaintService';
import {formatDate, timeAgo} from '@/utils/format';
import {Clock, MapPin} from 'lucide-react';

interface CitizenComplaintCardProps {
    complaint: ComplaintApiResponse;
}

export function CitizenComplaintCard({
                                         complaint,
                                     }: CitizenComplaintCardProps) {
    const lastUpdate =
        complaint.updatedAt ?? complaint.createdAt;

    return (
        <Link
            to={`/citizen/complaints/${encodeURIComponent(complaint.id)}`}
            className="block h-full rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            aria-label={`View complaint: ${complaint.title}`}
        >
            <Card className="h-full">
                <div className="flex items-center justify-between gap-2 p-4">
        <span
            className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
          {complaint.category}
        </span>

                    <span
                        className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200">
          {complaint.status}
        </span>
                </div>

                <div className="px-4 pb-2">
                    <p
                        className="text-xs font-medium text-ink-400"
                        title={complaint.id}
                    >
                        ID: {complaint.id.slice(0, 8)}
                    </p>

                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-ink-900 dark:text-ink-100">
                        {complaint.title}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-xs text-ink-500">
                        {complaint.description}
                    </p>
                </div>

                <div className="space-y-2 px-4 py-3 text-xs text-ink-500">
                    <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0"/>
                        <span>{complaint.location}</span>
                    </p>

                    <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0"/>
                        <span>
            Submitted {formatDate(complaint.createdAt)}
          </span>
                    </p>
                </div>

                <div
                    className="flex items-center justify-between gap-2 border-t border-ink-100 px-4 py-3 dark:border-ink-800">
        <span className="text-xs font-medium text-ink-700 dark:text-ink-200">
          Priority: {complaint.priority}
        </span>

                    <span className="text-xs text-ink-400">
          Updated {timeAgo(lastUpdate)}
        </span>
                </div>
            </Card>
        </Link>
    );

}
