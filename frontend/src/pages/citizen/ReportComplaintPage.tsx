import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, ChevronLeft, ChevronRight, MapPin, Crosshair, Sparkles, FileText,
  ClipboardCheck, Send, Download, Share2, Eye, Save, AlertTriangle, ShieldCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, RadioGroup, Checkbox } from '@/components/ui/Form';
import { FileUploader, type UploadedFile } from '@/components/forms/FileUploader';
import { MapContainer } from '@/components/maps/MapContainer';
import { CategoryBadge } from '@/components/ui/StatusBadge';
import { useApp } from '@/context/AppContext';
import { categoryOptions, categoryConfig, subcategories, priorityOptions, priorityConfig } from '@/data/metadata';
import type { ComplaintCategory, Priority } from '@/types';
import { cn } from '@/utils/format';

const steps = [
  { id: 1, label: 'Category', icon: 'FolderTree' },
  { id: 2, label: 'Description', icon: 'FileText' },
  { id: 3, label: 'Location', icon: 'MapPin' },
  { id: 4, label: 'Evidence', icon: 'Paperclip' },
  { id: 5, label: 'Review', icon: 'ClipboardCheck' },
];

interface FormState {
  category: ComplaintCategory | '';
  subcategory: string;
  title: string;
  priority: Priority;
  description: string;
  observedAt: string;
  isActive: boolean;
  affected: string;
  lat: number;
  lng: number;
  municipality: string;
  ward: string;
  street: string;
  address: string;
  anonymous: boolean;
  isPublic: boolean;
  declaration: boolean;
}

const initial: FormState = {
  category: '', subcategory: '', title: '', priority: 'medium',
  description: '', observedAt: '', isActive: true, affected: '1-10',
  lat: 27.7172, lng: 85.3249, municipality: 'Kathmandu Metropolitan City', ward: 'Ward 7',
  street: '', address: '', anonymous: false, isPublic: true, declaration: false,
};

export function ReportComplaintPage() {
  const { addToast } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initial);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ trackingId: string } | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!form.category) e.category = 'Select a category';
      if (!form.subcategory) e.subcategory = 'Select a subcategory';
      if (!form.title.trim()) e.title = 'Enter a complaint title';
    }
    if (s === 2) {
      if (form.description.trim().length < 20) e.description = 'Please describe the issue (at least 20 characters)';
      if (!form.observedAt) e.observedAt = 'Select when you observed the issue';
    }
    if (s === 3) {
      if (!form.street.trim()) e.street = 'Enter street or landmark';
      if (!form.address.trim()) e.address = 'Enter full address';
    }
    if (s === 5) {
      if (!form.declaration) e.declaration = 'You must accept the declaration';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep(step)) setStep((s) => Math.min(5, s + 1)); };
  const back = () => setStep((s) => Math.max(1, s - 1));

  const aiImprove = () => {
    set('description', form.description + ' This issue is affecting daily life in the area and requires prompt municipal attention. The problem has persisted and appears to be worsening without intervention.');
    addToast({ type: 'info', title: 'AI suggestion applied', message: 'Description enhanced with civic context.' });
  };

  const useLocation = () => {
    setForm((f) => ({ ...f, lat: 27.7212 + (Math.random() - 0.5) * 0.01, lng: 85.3521 + (Math.random() - 0.5) * 0.01 }));
    addToast({ type: 'success', title: 'Location detected', message: 'Map marker updated to your current location.' });
  };

  const submit = () => {
    if (!validateStep(5)) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const trackingId = `KMC-2024-${String(Math.floor(100000 + Math.random() * 899999)).slice(0, 6)}`;
      setDone({ trackingId });
      addToast({ type: 'success', title: 'Complaint submitted', message: `Tracking ID: ${trackingId}` });
    }, 1200);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-success-500 to-accent-600 p-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">Complaint Submitted!</h2>
            <p className="mt-2 text-white/85">Your complaint has been received and is being reviewed.</p>
          </div>
          <div className="p-6">
            <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4 text-center dark:border-ink-800 dark:bg-ink-900/40">
              <p className="text-xs text-ink-500">Your tracking ID</p>
              <p className="mt-1 text-2xl font-bold tracking-wider text-primary-700 dark:text-primary-300">{done.trackingId}</p>
            </div>
            <div className="mt-6 flex flex-col items-center">
              <div className="rounded-xl border border-ink-200 bg-white p-3 dark:border-ink-700 dark:bg-ink-900">
                <QRCodeSVG value={`https://civiclink.app/track?id=${done.trackingId}`} size={120} level="M" />
              </div>
              <p className="mt-2 text-xs text-ink-400">Scan to track this complaint</p>
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={() => addToast({ type: 'success', title: 'Receipt downloaded' })}>Download receipt</Button>
              <Button variant="outline" leftIcon={<Share2 className="h-4 w-4" />} onClick={() => addToast({ type: 'success', title: 'Link copied' })}>Share tracking link</Button>
            </div>
            <div className="mt-6 flex gap-3">
              <Button fullWidth variant="outline" onClick={() => navigate('/citizen/complaints')}>View my complaints</Button>
              <Button fullWidth onClick={() => { setDone(null); setStep(1); setForm(initial); setFiles([]); }}>Report another</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Report a Complaint" subtitle="Complete the steps below to submit your civic complaint." breadcrumbs={[{ label: 'Dashboard', to: '/citizen/dashboard' }, { label: 'Report' }]} />

      {/* Progress */}
      <div className="mb-6 card p-4">
        <ol className="flex items-center justify-between gap-1">
          {steps.map((s, i) => (
            <li key={s.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition',
                  step > s.id ? 'border-success-500 bg-success-500 text-white' :
                  step === s.id ? 'border-primary-600 bg-primary-600 text-white' :
                  'border-ink-200 bg-white text-ink-400 dark:border-ink-700 dark:bg-ink-900'
                )}>
                  {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                </div>
                <span className={cn('hidden text-[11px] font-medium sm:block', step >= s.id ? 'text-ink-900 dark:text-ink-100' : 'text-ink-400')}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={cn('mx-1 h-0.5 flex-1 rounded', step > s.id ? 'bg-success-500' : 'bg-ink-200 dark:bg-ink-700')} />}
            </li>
          ))}
        </ol>
      </div>

      <Card className="p-6">
        {/* Step 1: Category */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Complaint category</h2>
              <p className="mt-1 text-sm text-ink-500">Select the type of issue you want to report.</p>
            </div>
            <div>
              <span className="label-base">Main category</span>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {categoryOptions.map((c) => {
                  const cfg = categoryConfig[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { set('category', c); set('subcategory', ''); setErrors((er) => ({ ...er, category: '' })); }}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl border p-3 text-left text-sm transition',
                        form.category === c ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30' : 'border-ink-200 hover:border-ink-300 dark:border-ink-700'
                      )}
                    >
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', cfg.bg, cfg.text)}>
                        <FileText className="h-4 w-4" />
                      </span>
                      <span className="font-medium text-ink-900 dark:text-ink-100">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
              {errors.category && <p className="mt-1.5 text-xs text-error-600">{errors.category}</p>}
            </div>
            <Select label="Subcategory" placeholder="Select subcategory" value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} options={(form.category ? subcategories[form.category as ComplaintCategory] : []).map((s) => ({ value: s, label: s }))} error={errors.subcategory} />
            <Input label="Complaint title" required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Large pothole near Chabahil Chowk" error={errors.title} />
            <RadioGroup label="Priority / urgency level" name="priority" value={form.priority} onChange={(v) => set('priority', v as Priority)} options={priorityOptions.map((p) => ({ value: p, label: priorityConfig[p].label, description: p === 'urgent' ? 'Safety risk or major disruption — address within 24h' : p === 'high' ? 'Significant issue affecting many people' : p === 'medium' ? 'Normal concern' : 'Minor issue' }))} />
          </div>
        )}

        {/* Step 2: Description */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Describe the issue</h2>
              <p className="mt-1 text-sm text-ink-500">Provide details so authorities can understand and act.</p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="label-base">Detailed description</span>
                <button type="button" onClick={aiImprove} className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700 transition hover:bg-accent-100 dark:bg-accent-950/40 dark:text-accent-300">
                  <Sparkles className="h-3.5 w-3.5" /> AI improve
                </button>
              </div>
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe the issue, how long it has been there, and its impact…" className="min-h-[140px]" error={errors.description} />
              <p className="mt-1 text-xs text-ink-400">{form.description.length} characters · minimum 20</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Date and time observed" type="datetime-local" value={form.observedAt} onChange={(e) => set('observedAt', e.target.value)} error={errors.observedAt} />
              <Select label="Number of people affected" value={form.affected} onChange={(e) => set('affected', e.target.value)} options={[
                { value: '1-10', label: '1–10 people' },
                { value: '10-50', label: '10–50 people' },
                { value: '50-100', label: '50–100 people' },
                { value: '100+', label: '100+ people' },
              ]} />
            </div>
            <Checkbox label="The issue is currently still active" checked={form.isActive} onChange={(v) => set('isActive', v)} />
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Select the location</h2>
              <p className="mt-1 text-sm text-ink-500">Pin the exact location on the map for accurate routing.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Search location…" leftIcon={<MapPin className="h-4 w-4" />} className="flex-1" />
              <Button type="button" variant="outline" leftIcon={<Crosshair className="h-4 w-4" />} onClick={useLocation}>Use current location</Button>
            </div>
            <MapContainer height="h-72" draggableMarker center={{ lat: form.lat, lng: form.lng }} onMarkerDrag={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Municipality" value={form.municipality} onChange={(e) => set('municipality', e.target.value)} options={[
                { value: 'Kathmandu Metropolitan City', label: 'Kathmandu Metropolitan City' },
                { value: 'Lalitpur Metropolitan City', label: 'Lalitpur Metropolitan City' },
              ]} />
              <Select label="Ward" value={form.ward} onChange={(e) => set('ward', e.target.value)} options={Array.from({ length: 32 }, (_, i) => ({ value: `Ward ${i + 1}`, label: `Ward ${i + 1}` }))} />
            </div>
            <Input label="Street or landmark" required value={form.street} onChange={(e) => set('street', e.target.value)} placeholder="e.g. Chabahil Chowk" error={errors.street} />
            <Input label="Full address" required value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="e.g. Chabahil Chowk, Kathmandu 44600" error={errors.address} />
            <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500 dark:bg-ink-800/50">
              <MapPin className="mr-1 inline h-3 w-3" /> Coordinates: {form.lat.toFixed(4)}, {form.lng.toFixed(4)}
            </p>
          </div>
        )}

        {/* Step 4: Evidence */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Upload evidence</h2>
              <p className="mt-1 text-sm text-ink-500">Attach photos or videos to support your complaint.</p>
            </div>
            <FileUploader files={files} onAdd={(f) => setFiles((p) => [...p, ...f])} onRemove={(id) => setFiles((p) => p.filter((x) => x.id !== id))} capture label="" hint="Drag and drop photos or videos, or click to browse. Max 25MB per file." />
            <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4 dark:border-primary-900 dark:bg-primary-950/20">
              <p className="flex items-center gap-2 text-xs font-medium text-primary-700 dark:text-primary-300"><Sparkles className="h-4 w-4" /> AI image recognition</p>
              <p className="mt-1 text-xs text-primary-700/80 dark:text-primary-300/80">Our system can auto-detect issue type from your photos. This suggestion will be reviewed by staff before being applied.</p>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Review and submit</h2>
              <p className="mt-1 text-sm text-ink-500">Please verify all details before submitting.</p>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                <p className="text-xs font-semibold uppercase text-ink-400">Category & priority</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {form.category && <CategoryBadge category={form.category as ComplaintCategory} />}
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', priorityConfig[form.priority].bg, priorityConfig[form.priority].text)}>{priorityConfig[form.priority].label}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-ink-100">{form.title}</p>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{form.subcategory}</p>
              </div>
              <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                <p className="text-xs font-semibold uppercase text-ink-400">Description</p>
                <p className="mt-2 text-sm text-ink-700 dark:text-ink-200">{form.description}</p>
                <p className="mt-2 text-xs text-ink-500">Observed: {form.observedAt || 'Not specified'} · Affected: {form.affected} · Still active: {form.isActive ? 'Yes' : 'No'}</p>
              </div>
              <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                <p className="text-xs font-semibold uppercase text-ink-400">Location</p>
                <p className="mt-2 text-sm text-ink-700 dark:text-ink-200">{form.address || '—'}</p>
                <p className="text-xs text-ink-500">{form.ward} · {form.municipality}</p>
                <p className="text-xs text-ink-400">{form.lat.toFixed(4)}, {form.lng.toFixed(4)}</p>
              </div>
              <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                <p className="text-xs font-semibold uppercase text-ink-400">Evidence ({files.length} files)</p>
                {files.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {files.map((f) => (
                      <span key={f.id} className="rounded-lg bg-ink-100 px-2 py-1 text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">{f.name}</span>
                    ))}
                  </div>
                ) : <p className="mt-2 text-xs text-ink-400">No evidence attached</p>}
              </div>
            </div>
            <div className="space-y-3 rounded-xl border border-ink-100 bg-ink-50/50 p-4 dark:border-ink-800 dark:bg-ink-900/40">
              <Checkbox label="Display this complaint publicly on the public map (location only, no personal info)" checked={form.isPublic} onChange={(v) => set('isPublic', v)} />
              <Checkbox label="Submit anonymously (your name hidden from public view)" checked={form.anonymous} onChange={(v) => set('anonymous', v)} />
              <Checkbox label={<>I declare the information provided is true and accurate to the best of my knowledge</>} checked={form.declaration} onChange={(v) => set('declaration', v)} error={errors.declaration} />
            </div>
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Submitting false or misleading complaints may result in account suspension. Your IP and submission details are logged for audit purposes.</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-5 dark:border-ink-800">
          <Button variant="ghost" onClick={back} disabled={step === 1} leftIcon={<ChevronLeft className="h-4 w-4" />}>Back</Button>
          <div className="flex gap-2">
            {step < 5 && <Button variant="outline" leftIcon={<Save className="h-4 w-4" />} onClick={() => addToast({ type: 'info', title: 'Draft saved', message: 'You can continue later from Saved Drafts.' })}>Save draft</Button>}
            {step < 5 ? (
              <Button onClick={next} rightIcon={<ChevronRight className="h-4 w-4" />}>Continue</Button>
            ) : (
              <Button onClick={submit} loading={submitting} leftIcon={<Send className="h-4 w-4" />}>Submit complaint</Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
