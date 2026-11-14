import {Link} from 'react-router-dom';
import {Card} from '@/components/ui/Card';
import type {ComplaintApiResponse} from '@/services/complaintService';
import {formatDate, timeAgo} from '@/utils/format';
import {ArrowUpRight, Clock, MapPin} from 'lucide-react';

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
            className="group block h-full rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            aria-label={`View complaint: ${complaint.title}`}
        >
            <Card
                className="relative h-full overflow-hidden transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:border-primary-300 group-hover:shadow-xl group-focus-visible:border-primary-400 group-focus-visible:shadow-xl motion-reduce:transform-none motion-reduce:transition-none dark:group-hover:border-primary-700"
            >
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 via-accent-400 to-primary-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                />
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

                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-ink-900 transition-colors duration-300 group-hover:text-primary-600 group-focus-visible:text-primary-600 dark:text-ink-100 dark:group-hover:text-primary-300 motion-reduce:transition-none">
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

                    <span className="flex items-center gap-1 text-xs text-ink-400 transition-colors duration-300 group-hover:text-primary-600 group-focus-visible:text-primary-600 dark:group-hover:text-primary-300 motion-reduce:transition-none">
                      Updated {timeAgo(lastUpdate)}

                      <ArrowUpRight
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-focus-visible:-translate-y-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                      />
                    </span>
                </div>
            </Card>
        </Link>
    );

}
