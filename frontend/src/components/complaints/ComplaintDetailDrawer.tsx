import { Link } from 'react-router-dom';
import { MapPin, Building2, User, Clock, Calendar } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { Timeline } from './Timeline';
import { EvidenceGallery } from './EvidenceGallery';
import { MapContainer } from '@/components/maps/MapContainer';
import { Button } from '@/components/ui/Button';
import { formatDate, formatDateTime, timeAgo } from '@/utils/format';
import type { Complaint } from '@/types';

interface Props {
  complaint: Complaint | null;
  open: boolean;
  onClose: () => void;
  isPublic?: boolean;
}

export function ComplaintDetailDrawer({ complaint, open, onClose, isPublic }: Props) {
  if (!complaint) return null;
  return (
    <Drawer open={open} onClose={onClose} title={`Complaint ${complaint.trackingId}`} width="max-w-lg">
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={complaint.category} />
          <StatusBadge status={complaint.status} size="sm" />
          <PriorityBadge priority={complaint.priority} />
        </div>
        <h2 className="mt-3 text-lg font-semibold text-ink-900 dark:text-ink-100">{complaint.title}</h2>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{complaint.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-800/50">
            <p className="flex items-center gap-1.5 text-ink-400"><MapPin className="h-3.5 w-3.5" /> Location</p>
            <p className="mt-1 font-medium text-ink-700 dark:text-ink-200">{complaint.address}</p>
            <p className="text-ink-500">{complaint.ward} · {complaint.municipality}</p>
          </div>
          <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-800/50">
            <p className="flex items-center gap-1.5 text-ink-400"><Building2 className="h-3.5 w-3.5" /> Department</p>
            <p className="mt-1 font-medium text-ink-700 dark:text-ink-200">{complaint.assignedDepartment}</p>
            {complaint.assignedStaff && <p className="text-ink-500">{complaint.assignedStaff}</p>}
          </div>
          <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-800/50">
            <p className="flex items-center gap-1.5 text-ink-400"><Calendar className="h-3.5 w-3.5" /> Submitted</p>
            <p className="mt-1 font-medium text-ink-700 dark:text-ink-200">{formatDate(complaint.submittedAt)}</p>
          </div>
          <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-800/50">
            <p className="flex items-center gap-1.5 text-ink-400"><Clock className="h-3.5 w-3.5" /> Last update</p>
            <p className="mt-1 font-medium text-ink-700 dark:text-ink-200">{timeAgo(complaint.lastUpdate)}</p>
          </div>
        </div>

        <div className="mt-4">
          <MapContainer height="h-48" center={complaint.coordinates} markers={[{ id: complaint.id, ...complaint.coordinates, status: complaint.status }]} showControls={false} />
        </div>

        <h3 className="mt-5 text-sm font-semibold text-ink-900 dark:text-ink-100">Evidence</h3>
        <div className="mt-2">
          <EvidenceGallery evidence={complaint.evidence} />
        </div>

        <h3 className="mt-5 text-sm font-semibold text-ink-900 dark:text-ink-100">Timeline</h3>
        <div className="mt-3">
          <Timeline events={complaint.timeline} />
        </div>

        {complaint.comments.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-semibold text-ink-900 dark:text-ink-100">Communication</h3>
            <div className="mt-3 space-y-3">
              {complaint.comments.map((cm) => (
                <div key={cm.id} className={`rounded-xl p-3 text-sm ${cm.isInternal ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-ink-50 dark:bg-ink-800/50'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink-700 dark:text-ink-200">{cm.author}</span>
                    {cm.isInternal && <span className="rounded bg-amber-200 px-1.5 text-[10px] font-medium text-amber-800">Internal</span>}
                  </div>
                  <p className="mt-1 text-ink-600 dark:text-ink-300">{cm.message}</p>
                  <p className="mt-1 text-[10px] text-ink-400">{formatDateTime(cm.timestamp)}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {isPublic && (
          <div className="mt-5 border-t border-ink-100 pt-4 dark:border-ink-800">
            <Link to={`/track?id=${complaint.trackingId}`}>
              <Button fullWidth variant="outline">View full complaint details</Button>
            </Link>
          </div>
        )}
      </div>
    </Drawer>
  );
}
