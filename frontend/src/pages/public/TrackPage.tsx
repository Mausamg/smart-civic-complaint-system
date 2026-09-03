import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, AlertCircle, ArrowRight, QrCode as QrIcon, Share2, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { Timeline } from '@/components/complaints/Timeline';
import { EvidenceGallery } from '@/components/complaints/EvidenceGallery';
import { MapContainer } from '@/components/maps/MapContainer';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/services/api';
import type { Complaint } from '@/types';
import { formatDate, timeAgo } from '@/utils/format';
import { useApp } from '@/context/AppContext';

export function TrackPage() {
  const [params] = useSearchParams();
  const { addToast } = useApp();
  const [trackingId, setTrackingId] = useState(params.get('id') || '');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const search = async (id?: string) => {
    const q = (id ?? trackingId).trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const res = await api.getComplaint(q);
      if (res) setComplaint(res);
      else {
        setComplaint(null);
        setError(`No complaint found with ID "${q}". Please check and try again.`);
      }
    } catch {
      setError('Unable to fetch complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = params.get('id');
    if (id) { setTrackingId(id); search(id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <div className="container-page py-10">
      <PageHeader title="Track Complaint" subtitle="Enter your complaint tracking ID to view its current status." breadcrumbs={[{ label: 'Track' }]} />

      <Card className="mb-6 p-5">
        <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="e.g. KMC-2024-001284"
            leftIcon={<Search className="h-4 w-4" />}
            className="flex-1"
          />
          <Button type="submit" loading={loading}>Track Complaint</Button>
        </form>
        <p className="mt-2 text-xs text-ink-400">Tip: Try KMC-2024-001284, KMC-2024-001298, or KMC-2024-001311</p>
      </Card>

      {error && !complaint && (
        <EmptyState
          icon="SearchX"
          title="Complaint not found"
          description={error}
          action={<Button variant="outline" onClick={() => { setTrackingId(''); setSearched(false); setError(''); }}>Try another ID</Button>}
        />
      )}

      {!complaint && !error && !searched && (
        <EmptyState
          icon="Search"
          title="Enter a tracking ID"
          description="Your tracking ID was provided when you submitted a complaint. It looks like KMC-2024-XXXXXX."
        />
      )}

      {complaint && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-ink-400">{complaint.trackingId}</p>
                  <h2 className="mt-1 text-xl font-bold text-ink-900 dark:text-ink-100">{complaint.title}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <CategoryBadge category={complaint.category} />
                  <StatusBadge status={complaint.status} />
                  <PriorityBadge priority={complaint.priority} />
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{complaint.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div><p className="text-ink-400">Submitted</p><p className="mt-0.5 font-medium text-ink-700 dark:text-ink-200">{formatDate(complaint.submittedAt)}</p></div>
                <div><p className="text-ink-400">Last update</p><p className="mt-0.5 font-medium text-ink-700 dark:text-ink-200">{timeAgo(complaint.lastUpdate)}</p></div>
                <div><p className="text-ink-400">Department</p><p className="mt-0.5 font-medium text-ink-700 dark:text-ink-200">{complaint.assignedDepartment}</p></div>
                <div><p className="text-ink-400">Ward</p><p className="mt-0.5 font-medium text-ink-700 dark:text-ink-200">{complaint.ward}</p></div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Status Timeline</h3>
              <div className="mt-5">
                <Timeline events={complaint.timeline} />
              </div>
            </Card>

            {complaint.evidence.length > 0 && (
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Evidence</h3>
                <div className="mt-3">
                  <EvidenceGallery evidence={complaint.evidence} />
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Location</h3>
              <div className="mt-3">
                <MapContainer height="h-48" center={complaint.coordinates} markers={[{ id: complaint.id, ...complaint.coordinates, status: complaint.status }]} showControls={false} />
              </div>
              <p className="mt-2 text-xs text-ink-500">{complaint.address}</p>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Tracking QR Code</h3>
              <div className="mt-3 flex flex-col items-center">
                <div className="rounded-xl border border-ink-200 bg-white p-3 dark:border-ink-700">
                  <QRCodeSVG value={`https://civiclink.app/track?id=${complaint.trackingId}`} size={140} level="M" />
                </div>
                <p className="mt-2 text-xs text-ink-400">Scan to track this complaint</p>
              </div>
              <div className="mt-4 grid gap-2">
                <Button variant="outline" size="sm" leftIcon={<Share2 className="h-4 w-4" />} onClick={() => addToast({ type: 'success', title: 'Link copied', message: 'Tracking link copied to clipboard.' })}>Share tracking link</Button>
                <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => addToast({ type: 'success', title: 'Receipt downloaded' })}>Download receipt</Button>
                <Link to="/login">
                  <Button fullWidth size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>Login to manage</Button>
                </Link>
              </div>
            </Card>

            {complaint.rating && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Citizen Rating</h3>
                <p className="mt-2 text-2xl font-bold text-warning-600">{complaint.rating}.0 / 5.0</p>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">"{complaint.feedback}"</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
