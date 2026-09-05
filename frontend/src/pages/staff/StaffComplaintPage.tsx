import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Check, X, Clock, MessageSquare, Send, Paperclip, Phone, Mail, AlertTriangle,
  Upload, Calendar, FileText, History, MapPin, Building2, User, ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { Timeline } from '@/components/complaints/Timeline';
import { EvidenceGallery } from '@/components/complaints/EvidenceGallery';
import { MapContainer } from '@/components/maps/MapContainer';
import { FileUploader, type UploadedFile } from '@/components/forms/FileUploader';
import { Textarea, Input, Select } from '@/components/ui/Form';
import { Tabs } from '@/components/ui/Tabs';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ComplaintCard } from '@/components/complaints/ComplaintCard';
import { complaints } from '@/data/mockData';
import { statusOptions, statusConfig } from '@/data/metadata';
import { useApp } from '@/context/AppContext';
import { formatDate, formatDateTime, timeAgo, initials } from '@/utils/format';
import type { ComplaintStatus } from '@/types';
import { cn } from '@/utils/format';

export function StaffAssignedPage() {
  const { user } = useApp();
  const assigned = complaints.filter((c) => c.assignedStaff === user?.name);
  return (
    <div>
      <PageHeader title="Assigned Complaints" subtitle={`${assigned.length} complaints assigned to you.`} breadcrumbs={[{ label: 'Dashboard', to: '/staff/dashboard' }, { label: 'Assigned' }]} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assigned.map((c) => (
          <ComplaintCard key={c.id} complaint={c} linkTo={`/staff/complaints/${c.id}`} showCitizen />
        ))}
      </div>
    </div>
  );
}

export function StaffComplaintManagePage() {
  const { id } = useParams();
  const { addToast } = useApp();
  const complaint = complaints.find((c) => c.id === id);
  const [status, setStatus] = useState<ComplaintStatus>(complaint?.status || 'assigned');
  const [publicUpdate, setPublicUpdate] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [eta, setEta] = useState('');
  const [evidence, setEvidence] = useState<UploadedFile[]>([]);
  const [showResolve, setShowResolve] = useState(false);
  const [showReject, setShowReject] = useState(false);

  if (!complaint) {
    return <EmptyState icon="FileX" title="Complaint not found" action={<Link to="/staff/assigned"><Button>Back to assigned</Button></Link>} />;
  }

  const nearby = complaints.filter((c) => c.id !== complaint.id && c.ward === complaint.ward).slice(0, 2);

  const postUpdate = (type: 'public' | 'internal') => {
    const text = type === 'public' ? publicUpdate : internalNote;
    if (!text.trim()) return;
    addToast({ type: 'success', title: type === 'public' ? 'Public update posted' : 'Internal note added' });
    if (type === 'public') setPublicUpdate(''); else setInternalNote('');
  };

  const tabs = [
    {
      id: 'manage',
      label: 'Manage',
      icon: <FileText className="h-4 w-4" />,
      content: (
        <div className="space-y-5">
          {/* Status & actions */}
          <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Status & actions</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Select label="Change status" value={status} onChange={(e) => { setStatus(e.target.value as ComplaintStatus); addToast({ type: 'success', title: 'Status updated', message: `Now ${statusConfig[e.target.value as ComplaintStatus].label}` }); }} options={statusOptions.filter((s) => !['rejected', 'reopened'].includes(s)).map((s) => ({ value: s, label: statusConfig[s].label }))} />
              <Input label="Estimated resolution date" type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" leftIcon={<Check className="h-4 w-4" />} onClick={() => setShowResolve(true)}>Mark resolved</Button>
              <Button size="sm" variant="outline" leftIcon={<AlertTriangle className="h-4 w-4" />} onClick={() => addToast({ type: 'info', title: 'Escalation requested' })}>Escalate</Button>
              <Button size="sm" variant="outline" leftIcon={<X className="h-4 w-4" />} onClick={() => setShowReject(true)}>Request reassignment</Button>
            </div>
          </div>

          {/* Updates */}
          <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Add public update</h3>
            <Textarea value={publicUpdate} onChange={(e) => setPublicUpdate(e.target.value)} placeholder="Citizen-visible progress update…" className="mt-3 min-h-[80px]" />
            <div className="mt-2 flex justify-end"><Button size="sm" leftIcon={<Send className="h-4 w-4" />} onClick={() => postUpdate('public')}>Post update</Button></div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900 dark:bg-amber-950/20">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Internal note (staff only)</h3>
            <Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Note visible to staff and admins only…" className="mt-3 min-h-[80px]" />
            <div className="mt-2 flex justify-end"><Button size="sm" variant="outline" leftIcon={<MessageSquare className="h-4 w-4" />} onClick={() => postUpdate('internal')}>Add note</Button></div>
          </div>

          {/* Evidence upload */}
          <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Upload work evidence</h3>
            <div className="mt-3">
              <FileUploader files={evidence} onAdd={(f) => setEvidence((p) => [...p, ...f])} onRemove={(id2) => setEvidence((p) => p.filter((x) => x.id !== id2))} capture label="" />
            </div>
          </div>

          {/* Contact citizen */}
          <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Contact complainant</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" leftIcon={<Phone className="h-4 w-4" />} onClick={() => addToast({ type: 'info', title: 'Call initiated' })}>Call citizen</Button>
              <Button variant="outline" size="sm" leftIcon={<Mail className="h-4 w-4" />} onClick={() => addToast({ type: 'info', title: 'Email drafted' })}>Email citizen</Button>
              <Button variant="outline" size="sm" leftIcon={<MessageSquare className="h-4 w-4" />} onClick={() => addToast({ type: 'info', title: 'Info requested', message: 'Citizen asked for more details.' })}>Request more info</Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'details',
      label: 'Details',
      icon: <FileText className="h-4 w-4" />,
      content: (
        <div className="space-y-5">
          <p className="text-sm text-ink-700 dark:text-ink-200">{complaint.description}</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-800/50"><p className="text-ink-400">Submitted</p><p className="mt-1 font-medium text-ink-700 dark:text-ink-200">{formatDate(complaint.submittedAt)}</p></div>
            <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-800/50"><p className="text-ink-400">Due date</p><p className="mt-1 font-medium text-ink-700 dark:text-ink-200">{formatDate(complaint.dueDate)}</p></div>
            <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-800/50"><p className="text-ink-400">Citizen</p><p className="mt-1 font-medium text-ink-700 dark:text-ink-200">{complaint.isAnonymous ? 'Anonymous' : complaint.citizen.name}</p></div>
            <div className="rounded-lg bg-ink-50 p-3 dark:bg-ink-800/50"><p className="text-ink-400">Department</p><p className="mt-1 font-medium text-ink-700 dark:text-ink-200">{complaint.assignedDepartment}</p></div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Evidence ({complaint.evidence.length})</h4>
            <div className="mt-2"><EvidenceGallery evidence={complaint.evidence} /></div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Location</h4>
            <div className="mt-2"><MapContainer height="h-44" center={complaint.coordinates} markers={[{ id: complaint.id, ...complaint.coordinates, status: complaint.status }]} showControls={false} /></div>
            <p className="mt-1 text-xs text-ink-500">{complaint.address}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'timeline',
      label: 'History',
      icon: <History className="h-4 w-4" />,
      content: (
        <div>
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Complaint history</h3>
          <div className="mt-4"><Timeline events={complaint.timeline} /></div>
          {complaint.comments.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Communication</h4>
              <div className="mt-3 space-y-3">
                {complaint.comments.map((cm) => (
                  <div key={cm.id} className={cn('rounded-xl p-3 text-sm', cm.isInternal ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-ink-50 dark:bg-ink-800/50')}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink-700 dark:text-ink-200">{cm.author}</span>
                      {cm.isInternal && <span className="rounded bg-amber-200 px-1.5 text-[10px] font-medium text-amber-800">Internal</span>}
                    </div>
                    <p className="mt-1 text-ink-600 dark:text-ink-300">{cm.message}</p>
                    <p className="mt-1 text-[10px] text-ink-400">{formatDateTime(cm.timestamp)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'nearby',
      label: 'Nearby',
      icon: <MapPin className="h-4 w-4" />,
      content: (
        <div>
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Similar nearby complaints</h3>
          <p className="mt-1 text-xs text-ink-500">Complaints in the same ward — consider batch resolution.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {nearby.length > 0 ? nearby.map((c) => (
              <ComplaintCard key={c.id} complaint={c} linkTo={`/staff/complaints/${c.id}`} />
            )) : <p className="text-sm text-ink-400">No nearby complaints.</p>}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={complaint.title}
        subtitle={`${complaint.trackingId} · ${complaint.assignedDepartment}`}
        breadcrumbs={[{ label: 'Dashboard', to: '/staff/dashboard' }, { label: 'Assigned', to: '/staff/assigned' }, { label: complaint.trackingId }]}
        actions={<StatusBadge status={complaint.status} />}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <CategoryBadge category={complaint.category} />
        <PriorityBadge priority={complaint.priority} />
        <span className="text-xs text-ink-500">Submitted {formatDate(complaint.submittedAt)} · Updated {timeAgo(complaint.lastUpdate)}</span>
      </div>

      <Card className="p-5">
        <Tabs tabs={tabs} defaultTab="manage" variant="underline" />
      </Card>

      <ConfirmDialog
        open={showResolve}
        onClose={() => setShowResolve(false)}
        onConfirm={() => addToast({ type: 'success', title: 'Complaint marked resolved', message: 'Citizen will be notified to confirm.' })}
        title="Mark this complaint as resolved?"
        message="The citizen will be notified and asked to confirm the resolution. Ensure you have uploaded completion evidence."
        confirmLabel="Mark resolved"
        variant="primary"
      />
      <ConfirmDialog
        open={showReject}
        onClose={() => setShowReject(false)}
        onConfirm={() => addToast({ type: 'info', title: 'Reassignment requested' })}
        title="Request reassignment?"
        message="This will notify the admin that you cannot handle this complaint. Provide a reason in the internal notes."
        confirmLabel="Request reassignment"
        variant="warning"
      />
    </div>
  );
}
