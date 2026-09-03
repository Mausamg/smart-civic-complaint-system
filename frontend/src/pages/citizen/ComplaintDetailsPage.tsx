import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Building2, User, Clock, Calendar, MessageSquare, Share2, Download,
  Flag, RotateCcw, Star, Send, Paperclip, ThumbsUp, AlertTriangle, ShieldCheck, ArrowLeft,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { Timeline } from '@/components/complaints/Timeline';
import { EvidenceGallery } from '@/components/complaints/EvidenceGallery';
import { MapContainer } from '@/components/maps/MapContainer';
import { Textarea } from '@/components/ui/Form';
import { Rating } from '@/components/ui/Rating';
import { ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { complaints } from '@/data/mockData';
import { useApp } from '@/context/AppContext';
import { formatDate, formatDateTime, timeAgo, initials } from '@/utils/format';
import type { Comment } from '@/types';

export function ComplaintDetailsPage() {
  const { id } = useParams();
  const { addToast, user } = useApp();
  const navigate = useNavigate();
  const complaint = complaints.find((c) => c.id === id);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>(complaint?.comments || []);
  const [showReopen, setShowReopen] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [rating, setRating] = useState(complaint?.rating || 0);
  const [feedback, setFeedback] = useState('');

  if (!complaint) {
    return <EmptyState icon="FileX" title="Complaint not found" description="This complaint may have been withdrawn or removed." action={<Link to="/citizen/complaints"><Button>Back to my complaints</Button></Link>} />;
  }

  const addComment = () => {
    if (!comment.trim()) return;
    setComments((p) => [...p, {
      id: `cm-${Date.now()}`,
      author: user?.name || 'You',
      authorRole: 'citizen',
      message: comment,
      timestamp: new Date().toISOString(),
      avatar: user?.avatar,
    }]);
    setComment('');
    addToast({ type: 'success', title: 'Comment added', message: 'Your comment has been posted.' });
  };

  const submitRating = () => {
    if (rating === 0) return addToast({ type: 'error', title: 'Select a rating' });
    addToast({ type: 'success', title: 'Feedback submitted', message: 'Thank you for rating the service.' });
  };

  const isResolved = complaint.status === 'resolved';

  return (
    <div>
      <PageHeader
        title={complaint.title}
        subtitle={`${complaint.trackingId} · Submitted ${formatDate(complaint.submittedAt)}`}
        breadcrumbs={[{ label: 'Dashboard', to: '/citizen/dashboard' }, { label: 'My Complaints', to: '/citizen/complaints' }, { label: complaint.trackingId }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" leftIcon={<Share2 className="h-4 w-4" />} onClick={() => addToast({ type: 'success', title: 'Link copied' })}>Share</Button>
            <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => addToast({ type: 'success', title: 'Receipt downloaded' })}>Receipt</Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={complaint.category} />
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
            </div>
            <p className="mt-3 text-sm text-ink-700 dark:text-ink-200">{complaint.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-4 text-xs sm:grid-cols-4 dark:border-ink-800">
              <div><p className="flex items-center gap-1 text-ink-400"><MapPin className="h-3.5 w-3.5" /> Location</p><p className="mt-0.5 font-medium text-ink-700 dark:text-ink-200">{complaint.ward}</p></div>
              <div><p className="flex items-center gap-1 text-ink-400"><Building2 className="h-3.5 w-3.5" /> Department</p><p className="mt-0.5 font-medium text-ink-700 dark:text-ink-200">{complaint.assignedDepartment}</p></div>
              <div><p className="flex items-center gap-1 text-ink-400"><User className="h-3.5 w-3.5" /> Assigned to</p><p className="mt-0.5 font-medium text-ink-700 dark:text-ink-200">{complaint.assignedStaff || 'Unassigned'}</p></div>
              <div><p className="flex items-center gap-1 text-ink-400"><Calendar className="h-3.5 w-3.5" /> Due date</p><p className="mt-0.5 font-medium text-ink-700 dark:text-ink-200">{formatDate(complaint.dueDate)}</p></div>
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Status Timeline</h3>
            <p className="mt-1 text-xs text-ink-500">Track every stage of your complaint from submission to closure.</p>
            <div className="mt-5">
              <Timeline events={complaint.timeline} />
            </div>
          </Card>

          {/* Evidence */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Evidence ({complaint.evidence.length})</h3>
            <div className="mt-3">
              <EvidenceGallery evidence={complaint.evidence} />
            </div>
          </Card>

          {/* Communication */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Communication ({comments.length})</h3>
            <div className="mt-4 space-y-4">
              {comments.length === 0 ? (
                <p className="rounded-xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-400 dark:bg-ink-800/50">No comments yet. Start the conversation below.</p>
              ) : (
                comments.map((cm) => (
                  <div key={cm.id} className="flex gap-3">
                    {cm.avatar ? (
                      <img src={cm.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">{initials(cm.author)}</div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink-900 dark:text-ink-100">{cm.author}</span>
                        {cm.isInternal && <span className="rounded bg-amber-200 px-1.5 text-[10px] font-medium text-amber-800">Internal</span>}
                        <span className="rounded-full bg-ink-100 px-1.5 text-[10px] font-medium uppercase text-ink-500 dark:bg-ink-800">{cm.authorRole}</span>
                      </div>
                      <div className="mt-1.5 rounded-xl bg-ink-50 px-3.5 py-2.5 text-sm text-ink-700 dark:bg-ink-800/50 dark:text-ink-200">{cm.message}</div>
                      <p className="mt-1 text-[10px] text-ink-400">{formatDateTime(cm.timestamp)} · {timeAgo(cm.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-5 border-t border-ink-100 pt-4 dark:border-ink-800">
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment or reply…" className="min-h-[80px]" />
              <div className="mt-2 flex items-center justify-between">
                <Button variant="ghost" size="sm" leftIcon={<Paperclip className="h-4 w-4" />}>Attach</Button>
                <Button size="sm" onClick={addComment} leftIcon={<Send className="h-4 w-4" />}>Post comment</Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Location */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Location</h3>
            <div className="mt-3">
              <MapContainer height="h-44" center={complaint.coordinates} markers={[{ id: complaint.id, ...complaint.coordinates, status: complaint.status }]} showControls={false} />
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {complaint.address}</p>
            <p className="mt-1 text-xs text-ink-400">{complaint.municipality}</p>
          </Card>

          {/* Rating / Feedback */}
          {isResolved && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Rate the resolution</h3>
              <p className="mt-1 text-xs text-ink-500">Was your issue resolved satisfactorily?</p>
              <div className="mt-3 flex justify-center">
                <Rating value={rating} onChange={setRating} size="lg" label="Resolution rating" />
              </div>
              <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Share your feedback (optional)…" className="mt-3 min-h-[70px]" />
              <div className="mt-3 grid gap-2">
                <Button size="sm" onClick={submitRating} leftIcon={<ThumbsUp className="h-4 w-4" />}>Submit feedback</Button>
                <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setShowReopen(true)}>Reopen complaint</Button>
              </div>
            </Card>
          )}

          {/* Actions */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Actions</h3>
            <div className="mt-3 space-y-2">
              <Button variant="outline" size="sm" fullWidth leftIcon={<Download className="h-4 w-4" />} onClick={() => addToast({ type: 'success', title: 'Receipt downloaded' })}>Download receipt</Button>
              <Button variant="outline" size="sm" fullWidth leftIcon={<Share2 className="h-4 w-4" />} onClick={() => addToast({ type: 'success', title: 'Link copied' })}>Share complaint</Button>
              {!isResolved && (
                <Button variant="outline" size="sm" fullWidth leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setShowReopen(true)}>Reopen complaint</Button>
              )}
              <Button variant="outline" size="sm" fullWidth leftIcon={<Flag className="h-4 w-4" />} onClick={() => addToast({ type: 'info', title: 'Report submitted', message: 'An admin will review this update.' })}>Report inappropriate update</Button>
              <Button variant="ghost" size="sm" fullWidth className="text-error-600 hover:bg-error-50" onClick={() => setShowWithdraw(true)}>Withdraw complaint</Button>
            </div>
          </Card>

          {/* Privacy */}
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-600" />
              <div>
                <p className="text-xs font-semibold text-ink-900 dark:text-ink-100">Privacy protected</p>
                <p className="mt-1 text-xs text-ink-500">Your personal details are never shown publicly. {complaint.isAnonymous ? 'This complaint is submitted anonymously.' : 'Your name is visible to assigned staff only.'}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={showReopen}
        onClose={() => setShowReopen(false)}
        onConfirm={() => addToast({ type: 'success', title: 'Complaint reopened', message: 'The assigned department has been notified.' })}
        title="Reopen this complaint?"
        message="Reopening will send the complaint back to the assigned department for further action. Please provide additional details in the comments after reopening."
        confirmLabel="Reopen complaint"
        variant="warning"
      />
      <ConfirmDialog
        open={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        onConfirm={() => { addToast({ type: 'info', title: 'Complaint withdrawn' }); navigate('/citizen/complaints'); }}
        title="Withdraw this complaint?"
        message="Withdrawing will permanently close this complaint. This action cannot be undone."
        confirmLabel="Withdraw"
        variant="danger"
      />
    </div>
  );
}
