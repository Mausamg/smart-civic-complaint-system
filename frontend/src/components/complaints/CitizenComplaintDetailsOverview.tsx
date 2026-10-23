import { Card } from '@/components/ui/Card';
import type { ComplaintApiResponse } from '@/services/complaintService';
import { formatDate } from '@/utils/format';

interface CitizenComplaintDetailsOverviewProps {
  complaint: ComplaintApiResponse;
}

export function CitizenComplaintDetailsOverview({
  complaint,
}: CitizenComplaintDetailsOverviewProps) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-ink-400">Complaint ID</p>
          <p className="mt-1 break-all text-sm font-medium text-ink-700 dark:text-ink-200">
            {complaint.id}
          </p>
        </div>

        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
          {complaint.status}
        </span>
      </div>

      <h2 className="mt-5 text-lg font-semibold text-ink-900 dark:text-ink-100">
        {complaint.title}
      </h2>

      <p className="mt-3 whitespace-pre-wrap break-words text-sm text-ink-600 dark:text-ink-300">
        {complaint.description}
      </p>

      <div className="mt-5 grid gap-4 border-t border-ink-100 pt-5 sm:grid-cols-2 dark:border-ink-800">
        <div>
          <p className="text-xs text-ink-400">Category</p>
          <p className="mt-1 text-sm font-medium">{complaint.category}</p>
        </div>

        <div>
          <p className="text-xs text-ink-400">Priority</p>
          <p className="mt-1 text-sm font-medium">{complaint.priority}</p>
        </div>

        <div>
          <p className="text-xs text-ink-400">Location</p>
          <p className="mt-1 text-sm font-medium">{complaint.location}</p>
        </div>

        <div>
          <p className="text-xs text-ink-400">Submitted</p>
          <p className="mt-1 text-sm font-medium">
            {formatDate(complaint.createdAt)}
          </p>
        </div>

        <div>
          <p className="text-xs text-ink-400">Last updated</p>
          <p className="mt-1 text-sm font-medium">
            {complaint.updatedAt
              ? formatDate(complaint.updatedAt)
              : 'Not updated yet'}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-400">Subcategory</p>
          <p className="mt-1 text-sm font-medium">
            {complaint.subcategory || 'Not specified'}
          </p>
        </div>

        <div>
          <p className="text-xs text-ink-400">
            Date and time observed
          </p>
          <p className="mt-1 text-sm font-medium">
            {complaint.observedAt
                ? new Date(complaint.observedAt).toLocaleString()
                : 'Not specified'}
          </p>
        </div>

        <div>
          <p className="text-xs text-ink-400">
            Number of people affected
          </p>
          <p className="mt-1 text-sm font-medium">
            {complaint.affectedPeopleRange
                ? `${complaint.affectedPeopleRange} people`
                : 'Not specified'}
          </p>
        </div>

        <div>
          <p className="text-xs text-ink-400">
            Issue currently active
          </p>
          <p className="mt-1 text-sm font-medium">
            {complaint.isActive === null ||
            complaint.isActive === undefined
                ? 'Not specified'
                : complaint.isActive
                    ? 'Yes'
                    : 'No'}
          </p>
        </div>
      </div>
    </Card>
  );
}
