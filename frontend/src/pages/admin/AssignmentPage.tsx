import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, UserCheck, AlertTriangle, History, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, Input, Textarea } from '@/components/ui/Form';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/Modal';
import { complaints, departments, staffMembers } from '@/data/mockData';
import { categoryConfig } from '@/data/metadata';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/utils/format';
import type { Complaint } from '@/types';

export function AssignmentPage() {
  const { addToast } = useApp();
  const unassigned = complaints.filter((c) => !c.assignedStaff);
  const [selectedId, setSelectedId] = useState<string>(unassigned[0]?.id || complaints[0].id);
  const [department, setDepartment] = useState('');
  const [staff, setStaff] = useState('');
  const [priority, setPriority] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const selected: Complaint = complaints.find((c) => c.id === selectedId) || complaints[0];
  const suggestedDept = selected ? categoryConfig[selected.category].department : '';
  const suggestedStaff = staffMembers.find((s) => s.department === (department || suggestedDept) && s.isActive && s.activeComplaints < 6);

  const assign = () => {
    addToast({ type: 'success', title: 'Complaint assigned', message: `Assigned to ${staffMembers.find((s) => s.id === staff)?.name || 'staff'}.` });
    setDepartment(''); setStaff(''); setPriority(''); setDueDate(''); setNote('');
  };

  return (
    <div>
      <PageHeader title="Complaint Assignment" subtitle="Assign unassigned complaints to departments and staff." breadcrumbs={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Assignment' }]} />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Queue */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Assignment queue ({unassigned.length || complaints.length})</h3>
          {complaints.slice(0, 6).map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`block w-full rounded-xl border p-3 text-left transition ${selectedId === c.id ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/20' : 'border-ink-200 hover:border-ink-300 dark:border-ink-700'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <CategoryBadge category={c.category} />
                <PriorityBadge priority={c.priority} />
              </div>
              <p className="mt-1.5 line-clamp-1 text-sm font-medium text-ink-900 dark:text-ink-100">{c.title}</p>
              <p className="text-xs text-ink-500">{c.trackingId} · {c.ward} · {formatDate(c.submittedAt)}</p>
            </button>
          ))}
        </div>

        {/* Assignment panel */}
        <div className="lg:col-span-3">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={selected.category} />
              <StatusBadge status={selected.status} size="sm" />
              <PriorityBadge priority={selected.priority} />
            </div>
            <h3 className="mt-3 text-base font-semibold text-ink-900 dark:text-ink-100">{selected.title}</h3>
            <p className="mt-1.5 line-clamp-2 text-sm text-ink-600 dark:text-ink-300">{selected.description}</p>
            <p className="mt-2 text-xs text-ink-500">{selected.address} · {selected.ward}</p>

            <div className="mt-4 space-y-4 border-t border-ink-100 pt-4 dark:border-ink-800">
              <div className="rounded-lg bg-accent-50 p-3 dark:bg-accent-950/30">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-700 dark:text-accent-300"><Sparkles className="h-4 w-4" /> AI suggestions</p>
                <p className="mt-1 text-xs text-accent-700/90 dark:text-accent-300/90">Recommended department: <strong>{suggestedDept}</strong></p>
                {suggestedStaff && <p className="mt-0.5 text-xs text-accent-700/90 dark:text-accent-300/90">Recommended staff: <strong>{suggestedStaff.name}</strong> ({suggestedStaff.activeComplaints} active, {suggestedStaff.satisfaction}★ rating)</p>}
              </div>

              <Select label="Department" value={department} onChange={(e) => { setDepartment(e.target.value); setStaff(''); }} placeholder={suggestedDept ? `${suggestedDept} (suggested)` : 'Select department'} options={departments.filter((d) => d.isActive).map((d) => ({ value: d.id, label: `${d.name} (${d.activeComplaints} active)` }))} />
              <Select label="Staff member" value={staff} onChange={(e) => setStaff(e.target.value)} placeholder={suggestedStaff ? `${suggestedStaff.name} (suggested)` : 'Select staff'} options={staffMembers.filter((s) => s.isActive && (!department || departments.find((d) => d.id === department)?.name === s.department)).map((s) => ({ value: s.id, label: `${s.name} · ${s.role} (${s.activeComplaints} active)` }))} />

              {staff && (() => {
                const sm = staffMembers.find((s) => s.id === staff);
                if (!sm) return null;
                return (
                  <div className="rounded-lg border border-ink-100 p-3 dark:border-ink-800">
                    <p className="text-xs font-semibold text-ink-700 dark:text-ink-200">Selected staff workload</p>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                      <div className={`h-full rounded-full ${sm.activeComplaints > 6 ? 'bg-error-500' : sm.activeComplaints > 4 ? 'bg-warning-500' : 'bg-success-500'}`} style={{ width: `${Math.min(100, (sm.activeComplaints / 10) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-ink-500">{sm.activeComplaints} active · {sm.resolvedComplaints} resolved · {sm.satisfaction}★ satisfaction</p>
                  </div>
                );
              })()}

              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} placeholder="Keep current" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
                <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <Textarea label="Assignment note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for the assigned staff…" className="min-h-[70px]" />

              <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4 dark:border-ink-800">
                <Button leftIcon={<UserCheck className="h-4 w-4" />} onClick={() => setShowConfirm(true)}>Assign complaint</Button>
                <Button variant="outline" leftIcon={<AlertTriangle className="h-4 w-4" />} onClick={() => addToast({ type: 'info', title: 'Escalated' })}>Escalate</Button>
                <Button variant="ghost" leftIcon={<History className="h-4 w-4" />} onClick={() => addToast({ type: 'info', title: 'History opened' })}>Assignment history</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={assign}
        title="Assign this complaint?"
        message={`The complaint will be assigned and the staff member notified. Tracking ID: ${selected.trackingId}`}
        confirmLabel="Confirm assignment"
      />
    </div>
  );
}
