
import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Table as TableIcon } from 'lucide-react';

import { CitizenComplaintCard } from '@/components/complaints/CitizenComplaintCard';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';

import { useApp } from '@/context/AppContext';
import {
  getMyComplaints,
  type ComplaintApiResponse,
} from '@/services/complaintService';
import { cn, formatDate, timeAgo } from '@/utils/format';

const PER_PAGE = 6;

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function MyComplaintsPage() {
  const { accessToken } = useApp();

  const [complaints, setComplaints] = useState<ComplaintApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    if (!accessToken) {
      setComplaints([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getMyComplaints(accessToken)
      .then((data) => {
        if (!cancelled) {
          setComplaints(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setComplaints([]);
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load your complaints.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, retryCount]);

  const statusOptions = useMemo(
    () =>
      [...new Set(complaints.map((c) => c.status))]
        .sort()
        .map((value) => ({ value, label: value })),
    [complaints]
  );

  const categoryOptions = useMemo(
    () =>
      [...new Set(complaints.map((c) => c.category))]
        .sort()
        .map((value) => ({ value, label: value })),
    [complaints]
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    const results = complaints.filter((c) => {
      const matchesQuery =
        !search ||
        [c.id, c.title, c.description, c.category, c.location]
          .some((value) =>
            value.toLowerCase().includes(search)
          );

      return (
        matchesQuery &&
        (!status || c.status === status) &&
        (!category || c.category === category)
      );
    });

    return results.sort((a, b) => {
      if (sort === 'oldest') {
        return (
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
        );
      }

      if (sort === 'priority') {
        return (
          (priorityOrder[a.priority.toLowerCase()] ?? 99) -
          (priorityOrder[b.priority.toLowerCase()] ?? 99)
        );
      }

      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
    });
  }, [complaints, query, status, category, sort]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );

  const columns: Column<ComplaintApiResponse>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (c) => (
        <span className="font-mono text-xs" title={c.id}>
          {c.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (c) => (
        <span className="text-sm font-medium">
          {c.title}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (c) => c.category,
    },
    {
      key: 'location',
      header: 'Location',
      hideOnMobile: true,
      render: (c) => c.location,
    },
    {
      key: 'createdAt',
      header: 'Submitted',
      render: (c) => formatDate(c.createdAt),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (c) => c.priority,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => c.status,
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      hideOnMobile: true,
      render: (c) =>
        timeAgo(c.updatedAt ?? c.createdAt),
    },
  ];

  return (
    <div>
      <PageHeader
        title="My Complaints"
        subtitle={
          loading
            ? 'Loading your complaints...'
            : `${complaints.length} complaints you have submitted.`
        }
        breadcrumbs={[
          { label: 'Dashboard', to: '/citizen/dashboard' },
          { label: 'My Complaints' },
        ]}
      />

      <div className="mb-4 card p-4">
        <div className="flex flex-col gap-3">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search your complaints..."
            className="w-full"
          />

          <div className="flex flex-wrap items-center gap-2">

            <div className="w-full shrink-0 sm:w-44">
              <Select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  placeholder="All statuses"
                  options={statusOptions}
                  className="w-full"
              />
            </div>

            <div className="w-full shrink-0 sm:w-48">
              <Select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  placeholder="All categories"
                  options={categoryOptions}
                  className="w-full"
              />
            </div>

            <div className="w-full shrink-0 sm:w-44">
              <Select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { value: 'recent', label: 'Most recent' },
                    { value: 'oldest', label: 'Oldest first' },
                    { value: 'priority', label: 'By priority' },
                  ]}
                  className="w-full"
              />
            </div>

            <div className="flex w-fit shrink-0 rounded-xl border border-ink-200 p-0.5 sm:ml-auto dark:border-ink-700">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  view === 'grid'
                    ? 'bg-primary-600 text-white'
                    : 'text-ink-500'
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setView('table')}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  view === 'table'
                    ? 'bg-primary-600 text-white'
                    : 'text-ink-500'
                )}
                aria-label="Table view"
              >
                <TableIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div role="status" className="card p-8 text-center text-ink-500">
          Loading your complaints...
        </div>
      ) : error ? (
        <div role="alert" className="card space-y-4 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button
            onClick={() => setRetryCount((n) => n + 1)}
          >
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="Inbox"
          title="No complaints found"
          description={
            complaints.length === 0
              ? 'You have not submitted any complaints yet.'
              : 'Try adjusting your search or filters.'
          }
        />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((complaint) => (
            <CitizenComplaintCard
              key={complaint.id}
              complaint={complaint}
            />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={paged}
          rowKey={(c) => c.id}
        />
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
