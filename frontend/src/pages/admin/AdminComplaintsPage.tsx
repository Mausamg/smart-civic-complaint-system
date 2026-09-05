import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Download, SlidersHorizontal, ChevronDown, CheckSquare, UserCheck, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { ComplaintDetailDrawer } from '@/components/complaints/ComplaintDetailDrawer';
import { complaints as all } from '@/data/mockData';
import { statusOptions, statusConfig, categoryOptions, categoryConfig } from '@/data/metadata';
import { formatDate } from '@/utils/format';
import { useApp } from '@/context/AppContext';
import type { Complaint } from '@/types';

export function AdminComplaintsPage() {
  const { addToast } = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [ward, setWard] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerComplaint, setDrawerComplaint] = useState<Complaint | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const perPage = 8;

  const wards = Array.from(new Set(all.map((c) => c.ward))).sort();

  const filtered = useMemo(() => {
    return all.filter((c) => {
      const q = query.toLowerCase();
      const matchesQ = !q || c.title.toLowerCase().includes(q) || c.trackingId.toLowerCase().includes(q) || c.citizen.name.toLowerCase().includes(q);
      return matchesQ && (!status || c.status === status) && (!category || c.category === category) && (!ward || c.ward === ward) && (!priority || c.priority === priority);
    });
  }, [query, status, category, ward, priority]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleRow = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((s) => { const ids = paged.map((c) => c.id); return s.size === ids.length && ids.every((i) => s.has(i)) ? new Set() : new Set(ids); });

  const columns: Column<Complaint>[] = [
    { key: 'trackingId', header: 'ID', render: (c) => <span className="font-mono text-xs font-medium text-primary-600">{c.trackingId}</span> },
    { key: 'citizen', header: 'Citizen', hideOnMobile: true, render: (c) => <span className="text-xs text-ink-600 dark:text-ink-300">{c.isAnonymous ? 'Anonymous' : c.citizen.name}</span> },
    { key: 'title', header: 'Title', render: (c) => <span className="line-clamp-1 max-w-[180px] text-sm font-medium text-ink-900 dark:text-ink-100">{c.title}</span> },
    { key: 'category', header: 'Category', hideOnMobile: true, render: (c) => <CategoryBadge category={c.category} /> },
    { key: 'ward', header: 'Ward', hideOnMobile: true, render: (c) => <span className="text-xs text-ink-500">{c.ward}</span> },
    { key: 'priority', header: 'Priority', render: (c) => <PriorityBadge priority={c.priority} /> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} size="sm" /> },
    { key: 'department', header: 'Department', hideOnMobile: true, render: (c) => <span className="text-xs text-ink-500">{c.assignedDepartment}</span> },
    { key: 'submitted', header: 'Submitted', hideOnMobile: true, render: (c) => <span className="text-xs text-ink-500">{formatDate(c.submittedAt)}</span> },
    { key: 'due', header: 'Due', hideOnMobile: true, render: (c) => <span className="text-xs text-ink-500">{formatDate(c.dueDate)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Complaints Management"
        subtitle={`${filtered.length} complaints · ${selected.size} selected`}
        breadcrumbs={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Complaints' }]}
        actions={<Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={() => addToast({ type: 'success', title: 'Export started' })}>Export</Button>}
      />

      {/* Filters */}
      <div className="mb-4 card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search ID, title, citizen…" className="flex-1" />
          <div className="flex flex-wrap gap-2">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="Status" options={statusOptions.map((s) => ({ value: s, label: statusConfig[s].label }))} className="w-auto" />
            <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} placeholder="Category" options={categoryOptions.map((c) => ({ value: c, label: categoryConfig[c].label }))} className="w-auto" />
            <Select value={ward} onChange={(e) => { setWard(e.target.value); setPage(1); }} placeholder="Ward" options={wards.map((w) => ({ value: w, label: w }))} className="w-auto" />
            <Select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} placeholder="Priority" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} className="w-auto" />
          </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 dark:border-primary-900 dark:bg-primary-950/30">
          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" leftIcon={<UserCheck className="h-4 w-4" />} onClick={() => setShowBulkAssign(true)}>Bulk assign</Button>
            <Button size="sm" variant="outline" leftIcon={<CheckSquare className="h-4 w-4" />} onClick={() => addToast({ type: 'success', title: 'Status updated', message: `${selected.size} complaints updated.` })}>Update status</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon="Inbox" title="No complaints match your filters" description="Try adjusting or clearing filters." />
      ) : (
        <DataTable
          columns={columns}
          rows={paged}
          rowKey={(c) => c.id}
          onRowClick={(c) => { setDrawerComplaint(c); setDrawerOpen(true); }}
          selected={selected}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          allSelected={paged.length > 0 && paged.every((c) => selected.has(c.id))}
        />
      )}

      {totalPages > 1 && <div className="mt-6"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} /></div>}

      <ComplaintDetailDrawer complaint={drawerComplaint} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <Modal open={showBulkAssign} onClose={() => setShowBulkAssign(false)} title="Bulk assign complaints" description={`Assigning ${selected.size} selected complaints to a department and staff member.`} size="md"
        footer={<>
          <Button variant="outline" onClick={() => setShowBulkAssign(false)}>Cancel</Button>
          <Button onClick={() => { setShowBulkAssign(false); addToast({ type: 'success', title: 'Assigned', message: `${selected.size} complaints assigned.` }); setSelected(new Set()); }}>Assign</Button>
        </>}
      >
        <div className="space-y-4">
          <Select label="Department" placeholder="Select department" options={[{ value: 'roads', label: 'Roads & Infrastructure' }, { value: 'sanitation', label: 'Sanitation' }, { value: 'electrical', label: 'Electrical' }]} />
          <Select label="Staff member" placeholder="Select staff" options={[{ value: 's1', label: 'Bishnu Gurung' }, { value: 's2', label: 'Sita Tamang' }]} />
          <div className="rounded-lg bg-accent-50 p-3 text-xs text-accent-700 dark:bg-accent-950/30 dark:text-accent-300">
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> AI suggestion: Sanitation department has the lowest workload (4 active) and is best suited for these complaints.
          </div>
        </div>
      </Modal>
    </div>
  );
}
