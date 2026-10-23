import {createComplaint} from '@/services/complaintService';
import {FileUploader, type UploadedFile} from '@/components/forms/FileUploader';
import {CitizenLocationPicker} from '@/components/maps/CitizenLocationPicker';
import {Button} from '@/components/ui/Button';
import {Card} from '@/components/ui/Card';
import {Checkbox, Input, RadioGroup, Select, Textarea} from '@/components/ui/Form';
import {PageHeader} from '@/components/ui/PageHeader';
import {CategoryBadge} from '@/components/ui/StatusBadge';
import {useApp} from '@/context/AppContext';
import {categoryConfig, categoryOptions, priorityConfig, priorityOptions, subcategories} from '@/data/metadata';
import type {ComplaintCategory, Priority} from '@/types';
import {cn} from '@/utils/format';
import {AlertTriangle, Check, ChevronLeft, ChevronRight, FileText, MapPin, Send,} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

const steps = [
    {id: 1, label: 'Category', icon: 'FolderTree'},
    {id: 2, label: 'Description', icon: 'FileText'},
    {id: 3, label: 'Location', icon: 'MapPin'},
    {id: 4, label: 'Evidence', icon: 'Paperclip'},
    {id: 5, label: 'Review', icon: 'ClipboardCheck'},
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
    lat: number | null;
    lng: number | null;
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
    lat: null, lng: null, municipality: 'Kathmandu Metropolitan City', ward: 'Ward 7',
    street: '', address: '', anonymous: false, isPublic: true, declaration: false,
};

export function ReportComplaintPage() {
    const {addToast, accessToken} = useApp();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormState>(initial);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({...f, [k]: v}));

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

    const next = () => {
        if (validateStep(step)) setStep((s) => Math.min(5, s + 1));
    };
    const back = () => setStep((s) => Math.max(1, s - 1));

    const submit = async () => {
        if (submitting || !validateStep(5)) return;

        if (!accessToken) {
            addToast({
                type: 'error',
                title: 'Sign in required',
                message: 'Please sign in as a citizen to submit a complaint.',
            });
            return;
        }

        if (files.length > 0) {
            addToast({
                type: 'error',
                title: 'Evidence upload not available yet',
                message:
                    'Please remove attached files before submitting. Evidence uploads will be integrated separately.',
            });
            return;
        }

        if (form.anonymous) {
            addToast({
                type: 'error',
                title: 'Anonymous submission unavailable',
                message:
                    'Anonymous submission is not supported by the current API.',
            });
            return;
        }

        const title = form.title.trim();
        const description = form.description.trim();
        const category = form.category;
        const location = form.address.trim();

        if (
            !category ||
            title.length === 0 ||
            title.length > 150 ||
            description.length < 20 ||
            description.length > 2000 ||
            location.length === 0 ||
            location.length > 200
        ) {
            addToast({
                type: 'error',
                title: 'Please review your complaint',
                message:
                    'Check the title, description, category and address. Some fields may be missing or too long.',
            });
            return;
        }

        const observedDate = new Date(form.observedAt);

        if (Number.isNaN(observedDate.getTime())) {
            addToast({
                type: 'error',
                title: 'Invalid observation date',
                message: 'Please select a valid date and time.',
            });
            return;
        }

        const latitude = form.lat;
        const longitude = form.lng;

        if (
            (latitude === null) !== (longitude === null) ||
            (latitude !== null &&
                longitude !== null &&
                (
                    !Number.isFinite(latitude) ||
                    latitude < -90 ||
                    latitude > 90 ||
                    !Number.isFinite(longitude) ||
                    longitude < -180 ||
                    longitude > 180
                ))
        ) {
            addToast({
                type: 'error',
                title: 'Invalid map location',
                message: 'Please select a valid incident location.',
            });
            return;
        }

        setSubmitting(true);

        try {
            const createdComplaint = await createComplaint(
                {
                    title,
                    description,
                    category,
                    location,

                    subcategory: form.subcategory.trim(),
                    observedAt: observedDate.toISOString(),
                    affectedPeopleRange: form.affected,
                    isActive: form.isActive,

                    ...(latitude !== null && longitude !== null
                        ? {
                            latitude,
                            longitude,
                        }
                        : {}),

                },
                accessToken
            );

            addToast({
                type: 'success',
                title: 'Complaint submitted',
                message: 'Your complaint has been saved successfully.',
            });

            navigate(
                `/citizen/complaints/${encodeURIComponent(createdComplaint.id)}`,
                {replace: true}
            );
        } catch (error: unknown) {
            addToast({
                type: 'error',
                title: 'Submission failed',
                message:
                    error instanceof Error
                        ? error.message
                        : 'Unable to submit your complaint. Please try again.',
            });
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <div className="mx-auto max-w-3xl">
            <PageHeader title="Report a Complaint" subtitle="Complete the steps below to submit your civic complaint."
                        breadcrumbs={[{label: 'Dashboard', to: '/citizen/dashboard'}, {label: 'Report'}]}/>

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
                                    {step > s.id ? <Check className="h-4 w-4"/> : s.id}
                                </div>
                                <span
                                    className={cn('hidden text-[11px] font-medium sm:block', step >= s.id ? 'text-ink-900 dark:text-ink-100' : 'text-ink-400')}>{s.label}</span>
                            </div>
                            {i < steps.length - 1 && <div
                                className={cn('mx-1 h-0.5 flex-1 rounded', step > s.id ? 'bg-success-500' : 'bg-ink-200 dark:bg-ink-700')}/>}
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
                                            onClick={() => {
                                                set('category', c);
                                                set('subcategory', '');
                                                setErrors((er) => ({...er, category: ''}));
                                            }}
                                            className={cn(
                                                'flex items-center gap-2.5 rounded-xl border p-3 text-left text-sm transition',
                                                form.category === c ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30' : 'border-ink-200 hover:border-ink-300 dark:border-ink-700'
                                            )}
                                        >
                      <span
                          className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', cfg.bg, cfg.text)}>
                        <FileText className="h-4 w-4"/>
                      </span>
                                            <span
                                                className="font-medium text-ink-900 dark:text-ink-100">{cfg.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.category && <p className="mt-1.5 text-xs text-error-600">{errors.category}</p>}
                        </div>
                        <Select label="Subcategory" placeholder="Select subcategory" value={form.subcategory}
                                onChange={(e) => set('subcategory', e.target.value)}
                                options={(form.category ? subcategories[form.category as ComplaintCategory] : []).map((s) => ({
                                    value: s,
                                    label: s
                                }))} error={errors.subcategory}/>
                        <Input label="Complaint title" required value={form.title}
                               onChange={(e) => set('title', e.target.value)}
                               placeholder="e.g. Large pothole near Chabahil Chowk" error={errors.title}/>
                        <RadioGroup label="Priority / urgency level" name="priority" value={form.priority}
                                    onChange={(v) => set('priority', v as Priority)}
                                    options={priorityOptions.map((p) => ({
                                        value: p,
                                        label: priorityConfig[p].label,
                                        description: p === 'urgent' ? 'Safety risk or major disruption — address within 24h' : p === 'high' ? 'Significant issue affecting many people' : p === 'medium' ? 'Normal concern' : 'Minor issue'
                                    }))}/>
                    </div>
                )}

                {/* Step 2: Description */}
                {step === 2 && (
                    <div className="space-y-5 animate-fade-in">
                        <div>
                            <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Describe the issue</h2>
                            <p className="mt-1 text-sm text-ink-500">Provide details so authorities can understand and
                                act.</p>
                        </div>
                        <div>
                            <span className="label-base">Detailed description</span>
                            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                                      placeholder="Describe the issue, how long it has been there, and its impact…"
                                      className="min-h-[140px]" error={errors.description}/>
                            <p className="mt-1 text-xs text-ink-400">{form.description.length} characters · minimum
                                20</p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input label="Date and time observed" type="datetime-local" value={form.observedAt}
                                   onChange={(e) => set('observedAt', e.target.value)} error={errors.observedAt}/>
                            <Select label="Number of people affected" value={form.affected}
                                    onChange={(e) => set('affected', e.target.value)} options={[
                                {value: '1-10', label: '1–10 people'},
                                {value: '10-50', label: '10–50 people'},
                                {value: '50-100', label: '50–100 people'},
                                {value: '100+', label: '100+ people'},
                            ]}/>
                        </div>
                        <Checkbox label="The issue is currently still active" checked={form.isActive}
                                  onChange={(v) => set('isActive', v)}/>
                    </div>
                )}

                {/* Step 3: Location */}
                {step === 3 && (
                    <div className="space-y-5 animate-fade-in">
                        <div>
                            <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Select the
                                location</h2>
                            <p className="mt-1 text-sm text-ink-500">Pin the exact location on the map for accurate
                                routing.</p>
                        </div>

                        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                            The map starts in Kathmandu for navigation only. Click the map to select the incident
                            location. If selected, the coordinates will be saved with your complaint. Please also enter
                            the correct full address. Map selection does not automatically verify the municipality or
                            ward.
                        </p>


                        <CitizenLocationPicker
                            selectedLocation={
                                form.lat !== null && form.lng !== null
                                    ? {lat: form.lat, lng: form.lng}
                                    : null
                            }
                            onLocationSelect={({lat, lng}) =>
                                setForm((f) => ({
                                    ...f,
                                    lat,
                                    lng,
                                }))
                            }
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Select label="Municipality" value={form.municipality}
                                    onChange={(e) => set('municipality', e.target.value)} options={[
                                {value: 'Kathmandu Metropolitan City', label: 'Kathmandu Metropolitan City'},
                                {value: 'Lalitpur Metropolitan City', label: 'Lalitpur Metropolitan City'},
                            ]}/>
                            <Select label="Ward" value={form.ward} onChange={(e) => set('ward', e.target.value)}
                                    options={Array.from({length: 32}, (_, i) => ({
                                        value: `Ward ${i + 1}`,
                                        label: `Ward ${i + 1}`
                                    }))}/>
                        </div>
                        <Input label="Street or landmark" required value={form.street}
                               onChange={(e) => set('street', e.target.value)} placeholder="e.g. Chabahil Chowk"
                               error={errors.street}/>
                        <Input label="Full address" required value={form.address}
                               onChange={(e) => set('address', e.target.value)}
                               placeholder="e.g. Chabahil Chowk, Kathmandu 44600" error={errors.address}/>
                        <p className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500 dark:bg-ink-800/50">
                            <MapPin
                                className="mr-1 inline h-3 w-3"/>Coordinates: {form.lat !== null && form.lng !== null
                            ? `${form.lat.toFixed(4)}, ${form.lng.toFixed(4)}`
                            : 'Not selected'}
                        </p>
                    </div>
                )}

                {/* Step 4: Evidence */}
                {step === 4 && (
                    <div className="space-y-5 animate-fade-in">
                        <div>
                            <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-100">Upload evidence</h2>
                            <p className="mt-1 text-sm text-ink-500">
                                Evidence uploads are not available yet.
                                Please submit your complaint without attachments.
                            </p>
                        </div>
                        <FileUploader files={files} onAdd={(f) => setFiles((p) => [...p, ...f])}
                                      onRemove={(id) => setFiles((p) => p.filter((x) => x.id !== id))} capture label=""
                                      hint="Drag and drop photos or videos, or click to browse. Max 25MB per file."/>
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
                                    {form.category && <CategoryBadge category={form.category as ComplaintCategory}/>}
                                    <span
                                        className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', priorityConfig[form.priority].bg, priorityConfig[form.priority].text)}>{priorityConfig[form.priority].label}</span>
                                </div>
                                <p className="mt-2 text-sm font-semibold text-ink-900 dark:text-ink-100">{form.title}</p>
                                <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{form.subcategory}</p>
                            </div>
                            <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                                <p className="text-xs font-semibold uppercase text-ink-400">Description</p>
                                <p className="mt-2 text-sm text-ink-700 dark:text-ink-200">{form.description}</p>
                                <p className="mt-2 text-xs text-ink-500">Observed: {form.observedAt || 'Not specified'} ·
                                    Affected: {form.affected} · Still active: {form.isActive ? 'Yes' : 'No'}</p>
                            </div>
                            <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                                <p className="text-xs font-semibold uppercase text-ink-400">Location</p>
                                <p className="mt-2 text-sm text-ink-700 dark:text-ink-200">{form.address || '—'}</p>
                                <p className="mt-2 text-xs text-ink-500">
                                    Map location:{' '}
                                    {form.lat !== null && form.lng !== null
                                        ? `${form.lat.toFixed(6)}, ${form.lng.toFixed(6)}`
                                        : 'Not selected'}
                                </p>
                                <p className="text-xs text-ink-500">{form.ward} · {form.municipality}</p>
                            </div>
                            <div className="rounded-xl border border-ink-100 p-4 dark:border-ink-800">
                                <p className="text-xs font-semibold uppercase text-ink-400">Evidence
                                    ({files.length} files)</p>
                                {files.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {files.map((f) => (
                                            <span key={f.id}
                                                  className="rounded-lg bg-ink-100 px-2 py-1 text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">{f.name}</span>
                                        ))}
                                    </div>
                                ) : <p className="mt-2 text-xs text-ink-400">No evidence attached</p>}
                            </div>
                        </div>

                        <div
                            className="space-y-3 rounded-xl border border-ink-100 bg-ink-50/50 p-4 dark:border-ink-800 dark:bg-ink-900/40">

                            <div
                                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                                This version saves your complaint title, description, category, full address,
                                subcategory, observed date and time, number of people affected, and whether the issue is
                                still active. Latitude and longitude are also saved if you selected a map location.
                                Selected priority, municipality and ward are not yet saved. Evidence uploads and
                                anonymous/public visibility settings are not supported yet.
                            </div>

                            <Checkbox
                                label={
                                    <>
                                        I declare the information provided is true and accurate
                                        to the best of my knowledge
                                    </>
                                }
                                checked={form.declaration}
                                onChange={(v) => set('declaration', v)}
                                error={errors.declaration}
                            />

                        </div>

                        <div
                            className="flex items-start gap-2.5 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>
                            <p>
                                Please ensure that the information provided is accurate
                                and complete before submitting your complaint.
                                Once submitted, you can view your complaint
                                and track its status in My Complaints.
                            </p>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div
                    className="mt-6 flex items-center justify-between border-t border-ink-100 pt-5 dark:border-ink-800">
                    <Button variant="ghost" onClick={back} disabled={step === 1}
                            leftIcon={<ChevronLeft className="h-4 w-4"/>}>Back</Button>
                    <div className="flex gap-2">
                        {step < 5 ? (
                            <Button onClick={next} rightIcon={<ChevronRight className="h-4 w-4"/>}>Continue</Button>
                        ) : (
                            <Button onClick={submit} loading={submitting} leftIcon={<Send className="h-4 w-4"/>}>Submit
                                complaint</Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
