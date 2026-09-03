import { Link } from 'react-router-dom';
import { Star, MessageSquare, ThumbsUp, AlertTriangle, Send, FileEdit, HelpCircle, Mail, Phone, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Rating } from '@/components/ui/Rating';
import { Textarea, Select, Input } from '@/components/ui/Form';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApp } from '@/context/AppContext';
import { complaints } from '@/data/mockData';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/utils/format';
import { useState } from 'react';

export function FeedbackPage() {
  const { addToast } = useApp();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const resolvedComplaints = complaints.filter((c) => c.citizen.id === 'u-citizen-1' && (c.status === 'resolved' || c.status === 'closed'));

  return (
    <div>
      <PageHeader title="Feedback" subtitle="Rate resolved complaints and share your experience." breadcrumbs={[{ label: 'Dashboard', to: '/citizen/dashboard' }, { label: 'Feedback' }]} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {resolvedComplaints.length === 0 ? (
            <EmptyState icon="Star" title="No resolved complaints to rate" description="Your resolved complaints will appear here for feedback." />
          ) : (
            resolvedComplaints.map((c) => (
              <Card key={c.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-ink-400">{c.trackingId}</p>
                    <h3 className="mt-1 text-sm font-semibold text-ink-900 dark:text-ink-100">{c.title}</h3>
                    <p className="mt-1 text-xs text-ink-500">Resolved {formatDate(c.lastUpdate)}</p>
                  </div>
                  <StatusBadge status={c.status} size="sm" />
                </div>
                {c.rating ? (
                  <div className="mt-4 rounded-xl bg-success-50 p-4 dark:bg-success-950/30">
                    <p className="text-xs font-semibold text-success-700 dark:text-success-300">Your feedback</p>
                    <div className="mt-1.5 flex items-center gap-2"><Rating value={c.rating} readOnly size="sm" /></div>
                    <p className="mt-2 text-sm text-ink-700 dark:text-ink-200">"{c.feedback}"</p>
                  </div>
                ) : (
                  <div className="mt-4 border-t border-ink-100 pt-4 dark:border-ink-800">
                    <p className="text-xs font-medium text-ink-600 dark:text-ink-300">Rate this resolution:</p>
                    <div className="mt-2 flex items-center gap-2"><Rating value={rating} onChange={setRating} size="md" /></div>
                    <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Share your feedback (optional)…" className="mt-3 min-h-[70px]" />
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" leftIcon={<ThumbsUp className="h-4 w-4" />} onClick={() => { addToast({ type: 'success', title: 'Feedback submitted' }); setRating(0); setFeedback(''); }}>Submit feedback</Button>
                      <Link to={`/citizen/complaints/${c.id}`}><Button variant="ghost" size="sm">Reopen complaint</Button></Link>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-ink-100"><AlertTriangle className="h-4 w-4 text-error-600" /> Report poor service</h3>
            <p className="mt-2 text-xs text-ink-500">If a complaint was poorly handled, you can report it for admin review.</p>
            <Select className="mt-3" placeholder="Select complaint" options={complaints.map((c) => ({ value: c.id, label: c.trackingId }))} />
            <Textarea className="mt-3 min-h-[80px]" placeholder="Describe the issue with the service…" />
            <Button className="mt-3" size="sm" fullWidth leftIcon={<Send className="h-4 w-4" />} onClick={() => addToast({ type: 'info', title: 'Report submitted', message: 'An admin will review your report.' })}>Submit report</Button>
          </Card>
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-ink-100"><Star className="h-4 w-4 text-warning-500" /> Your average rating</h3>
            <p className="mt-3 text-3xl font-bold text-warning-600">4.5</p>
            <p className="mt-1 text-xs text-ink-500">Based on 2 rated complaints</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function SavedDraftsPage() {
  return (
    <div>
      <PageHeader title="Saved Drafts" subtitle="Complaints you started but haven't submitted yet." breadcrumbs={[{ label: 'Dashboard', to: '/citizen/dashboard' }, { label: 'Drafts' }]} />
      <EmptyState
        icon="FileEdit"
        title="No saved drafts"
        description="Drafts of complaints you start will be saved here so you can continue later."
        action={<Link to="/citizen/report"><Button leftIcon={<FileEdit className="h-4 w-4" />}>Start a complaint</Button></Link>}
      />
    </div>
  );
}

export function HelpSupportPage() {
  const { addToast } = useApp();
  return (
    <div>
      <PageHeader title="Help & Support" subtitle="Find answers or reach out to our support team." breadcrumbs={[{ label: 'Dashboard', to: '/citizen/dashboard' }, { label: 'Help' }]} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {[
            { q: 'How do I submit a complaint?', a: 'Click "Report New Complaint" and follow the 5-step form: category, description, location, evidence, and review.' },
            { q: 'How do I track my complaint?', a: 'Use the tracking ID provided after submission on the Track Complaint page, or view all in My Complaints.' },
            { q: 'Can I edit a submitted complaint?', a: 'You can add comments and evidence, but cannot edit the original. For changes, contact support.' },
            { q: 'What if my issue is not resolved?', a: 'You can reopen a resolved complaint from the complaint details page with new details.' },
            { q: 'Is my information private?', a: 'Yes. Personal details are never shown publicly. You can also submit anonymously.' },
          ].map((f, i) => (
            <Card key={i} className="p-5">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">{f.q}</h3>
              <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{f.a}</p>
            </Card>
          ))}
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-ink-100"><MessageSquare className="h-4 w-4 text-primary-600" /> Contact support</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input placeholder="Your email" />
              <Input placeholder="Subject" />
            </div>
            <Textarea className="mt-3 min-h-[100px]" placeholder="How can we help?" />
            <Button className="mt-3" leftIcon={<Send className="h-4 w-4" />} onClick={() => addToast({ type: 'success', title: 'Message sent', message: 'Support will respond within 2 days.' })}>Send message</Button>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-ink-100"><HelpCircle className="h-4 w-4 text-primary-600" /> Quick help</h3>
            <div className="mt-3 space-y-2 text-sm">
              <Link to="/faq" className="block rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">FAQ page →</Link>
              <Link to="/contact" className="block rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">Contact office →</Link>
              <Link to="/about" className="block rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">About the system →</Link>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Municipal helpline</h3>
            <div className="mt-3 space-y-2 text-sm text-ink-600 dark:text-ink-300">
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary-600" /> 16600123456</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary-600" /> support@civiclink.gov</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary-600" /> Bagdurbar, Kathmandu</p>
            </div>
            <p className="mt-3 rounded-lg bg-error-50 p-2 text-xs text-error-700 dark:bg-error-950/30 dark:text-error-300">For emergencies call 100 (Police), 102 (Ambulance), 101 (Fire).</p>
          </Card>
        </div>
      </div>
    </div>
  );
}


