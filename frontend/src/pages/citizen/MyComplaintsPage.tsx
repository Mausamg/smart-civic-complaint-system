import { useState, useMemo } from 'react';
import { LayoutGrid, Table as TableIcon, SlidersHorizontal, Download, ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ComplaintCard } from '@/components/complaints/ComplaintCard';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { complaints as all } from '@/data/mockData';
import { statusOptions, statusConfig, categoryOptions, categoryConfig } from '@/data/metadata';
import { formatDate, timeAgo } from '@/utils/format';
import { useApp } from '@/context/AppContext';
import type { Complaint } from '@/types';
import { cn } from '@/utils/format';

export function MyComplaintsPage() {
  const { addToast } = useApp();
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const perPage = 6;

  const myComplaints = useMemo(() => all.filter((c) => c.citizen.id === 'u-citizen-1'), []);

  const filtered = useMemo(() => {
    let list = myComplaints.filter((c) => {
      const q = query.toLowerCase();
      const matchesQ = !q || c.title.toLowerCase().includes(q) || c.trackingId.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      const matchesStatus = !status || c.status === status;
      const matchesCat = !category || c.category === category;
      return matchesQ && matchesStatus && matchesCat;
    });
    list = list.sort((a, b) => {
      if (sort === 'recent') return +new Date(b.lastUpdate) - +new Date(a.lastUpdate);
      if (sort === 'oldest') return +new Date(a.submittedAt) - +new Date(b.submittedAt);
      if (sort === 'priority') return ['urgent', 'high', 'medium', 'low'].indexOf(a.priority) - ['urgent', 'high', 'medium', 'low'].indexOf(b.priority);
      return 0;
    });
    return list;
  }, [myComplaints, query, status, category, sort]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const columns: Column<Complaint>[] = [
    { key: 'trackingId', header: 'ID', render: (c) => <span className="font-mono text-xs font-medium text-primary-600">{c.trackingId}</span> },
    { key: 'title', header: 'Title', render: (c) => <span className="line-clamp-1 max-w-[200px] text-sm font-medium text-ink-900 dark:text-ink-100">{c.title}</span> },
    { key: 'category', header: 'Category', hideOnMobile: true, render: (c) => <CategoryBadge category={c.category} /> },
    { key: 'location', header: 'Location', hideOnMobile: true, render: (c) => <span className="text-xs text-ink-500">{c.ward}</span> },
    { key: 'submitted', header: 'Submitted', hideOnMobile: true, render: (c) => <span className="text-xs text-ink-500">{formatDate(c.submittedAt)}</span> },
    { key: 'priority', header: 'Priority', render: (c) => <PriorityBadge priority={c.priority} /> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} size="sm" /> },
    { key: 'updated', header: 'Updated', hideOnMobile: true, render: (c) => <span className="text-xs text-ink-400">{timeAgo(c.lastUpdate)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="My Complaints"
        subtitle={`${myComplaints.length} complaints you have submitted.`}
        breadcrumbs={[{ label: 'Dashboard', to: '/citizen/dashboard' }, { label: 'My Complaints' }]}
        actions={
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={() => addToast({ type: 'success', title: 'Export started', message: 'Your complaints are being exported as CSV.' })}>
            Export
          </Button>
        }
      />

      <div className="mb-4 card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by title or tracking ID…" className="flex-1" />
          <div className="flex flex-wrap gap-2">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All status" options={statusOptions.map((s) => ({ value: s, label: statusConfig[s].label }))} className="w-auto" />
            <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} placeholder="All categories" options={categoryOptions.map((c) => ({ value: c, label: categoryConfig[c].label }))} className="w-auto" />
            <Select value={sort} onChange={(e) => setSort(e.target.value)} options={[
              { value: 'recent', label: 'Most recent' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'priority', label: 'By priority' },
            ]} className="w-auto" />
            <div className="flex rounded-xl border border-ink-200 p-0.5 dark:border-ink-700">
              <button onClick={() => setView('grid')} className={cn('flex h-9 w-9 items-center justify-center rounded-lg', view === 'grid' ? 'bg-primary-600 text-white' : 'text-ink-500')} aria-label="Grid view"><LayoutGrid className="h-4 w-4" /></button>
              <button onClick={() => setView('table')} className={cn('flex h-9 w-9 items-center justify-center rounded-lg', view === 'table' ? 'bg-primary-600 text-white' : 'text-ink-500')} aria-label="Table view"><TableIcon className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="Inbox"
          title="No complaints found"
          description="Try adjusting your filters or submit a new complaint."
        />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((c) => (
            <ComplaintCard key={c.id} complaint={c} linkTo={`/citizen/complaints/${c.id}`} showComments />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={paged}
          rowKey={(c) => c.id}
          onRowClick={(c) => (window.location.href = `/citizen/complaints/${c.id}`)}
        />
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
