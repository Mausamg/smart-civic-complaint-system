import { LiveComplaintCard } from '@/components/complaints/LiveComplaintCard';
import type { ComplaintApiResponse } from '@/services/complaintService';

interface CitizenComplaintCardProps {
  complaint: ComplaintApiResponse;
}

export function CitizenComplaintCard({
  complaint,
}: CitizenComplaintCardProps) {
  return (
    <LiveComplaintCard
      variant="regular"
      complaint={{
        id: complaint.id,
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        status: complaint.status,
        priority: complaint.priority,
        location: complaint.location,
        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
      }}
      detailsTo={`/citizen/complaints/${encodeURIComponent(complaint.id)}`}
    />
  );
}
