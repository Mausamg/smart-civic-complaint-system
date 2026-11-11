import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Input, Select } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { useApp } from '@/context/AppContext';

import {
  getAdminComplaints,
  type AdminComplaintsQuery,
  type ComplaintApiResponse,
  type PaginatedComplaintsResponse,
} from '@/services/complaintService';

function readableValue(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

function userName(
  user: ComplaintApiResponse['submittedBy']
): string {
  if (!user) return 'Unavailable';

  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || 'Unavailable';
}

const statusStyles: Record<string, string> = {
  submitted: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  underreview: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  inprogress: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  resolved: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  withdrawn: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  high: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  critical: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};

function normalizedValue(value: string): string {
  return value.replace(/[^a-z]/gi, '').toLowerCase();
}

const columns: Column<ComplaintApiResponse>[] = [
  {
    key: 'id',
    header: 'Complaint ID',
    render: (item) => (
      <span
        title={item.id}
        className="font-mono text-xs font-medium text-primary-600"
      >
        {item.id.slice(0, 8)}
      </span>
    ),
  },
  {
    key: 'title',
    header: 'Title',
    render: (item) => (
      <span className="line-clamp-2 max-w-[220px] break-words [overflow-wrap:anywhere] font-medium">
        {item.title}
      </span>
    ),
  },
  {
    key: 'citizen',
    header: 'Citizen',
    hideOnMobile: true,
    render: (item) => (
      <span className="whitespace-nowrap text-xs">
        {userName(item.submittedBy)}
      </span>
    ),
  },
  {
    key: 'category',
    header: 'Category',
    hideOnMobile: true,
    render: (item) => (
      <span>{readableValue(item.category).replace(/\b\w/g, (letter) => letter.toUpperCase())}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (item) => (
      <span
        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          statusStyles[normalizedValue(item.status)] ??
          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        }`}
      >
        {readableValue(item.status)}
      </span>
    ),
  },
  {
    key: 'priority',
    header: 'Priority',
    render: (item) => (
      <span
        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          priorityStyles[normalizedValue(item.priority)] ??
          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        }`}
      >
        {readableValue(item.priority)}
      </span>
    ),
  },
  {
    key: 'location',
    header: 'Location',
    hideOnMobile: true,
    render: (item) => (
      <span className="text-xs">
        {item.location || 'Not provided'}
      </span>
    ),
  },
  {
    key: 'assigned',
    header: 'Assigned Staff',
    hideOnMobile: true,
    render: (item) => (
      <span className="whitespace-nowrap text-xs">
        {item.assignedTo
          ? userName(item.assignedTo)
          : item.assignedToUserId
            ? 'Assigned'
            : 'Unassigned'}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'Submitted',
    hideOnMobile: true,
    render: (item) => (
      <time
        dateTime={item.createdAt}
        className="whitespace-nowrap text-xs text-ink-600 dark:text-ink-300"
      >
        {new Date(item.createdAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </time>
    ),
  },
];

export function AdminComplaintsLive() {
  const { accessToken } = useApp();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sortMode, setSortMode] = useState('createdAt:desc');

  const [textFilters, setTextFilters] = useState({
    search: '',
    category: '',
    location: '',
  });

  const [sortBy, sortDirection] = sortMode.split(':') as [
    NonNullable<AdminComplaintsQuery['sortBy']>,
    NonNullable<AdminComplaintsQuery['sortDirection']>,
  ];
  const [result, setResult] =
    useState<PaginatedComplaintsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const next = {
        search: search.trim(),
        category: category.trim(),
        location: location.trim(),
      };

      setTextFilters((previous) =>
        previous.search === next.search &&
        previous.category === next.category &&
        previous.location === next.location
          ? previous
          : next
      );

      setPage(1);
    }, 400);

    return () => clearTimeout(timeout);
  }, [search, category, location]);

  useEffect(() => {
    let cancelled = false;

    setResult(null);
    setLoading(true);
    setError(null);

    if (!accessToken) {
      setError('Please sign in as an administrator.');
      setLoading(false);

      return () => {
        cancelled = true;
      };
    }

    getAdminComplaints(accessToken, {
      page,
      pageSize: 10,
      search: textFilters.search || undefined,
      category: textFilters.category || undefined,
      location: textFilters.location || undefined,
      status: status || undefined,
      priority: priority || undefined,
      sortBy,
      sortDirection,
    })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load complaints.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    page,
    retryCount,
    textFilters,
    status,
    priority,
    sortBy,
    sortDirection,
  ]);

  return (
    <div>
      <PageHeader
        title="Complaints Management"
        subtitle={
          result
            ? `${result.totalCount} complaints`
            : 'View and manage submitted complaints.'
        }
        breadcrumbs={[
          { label: 'Admin', to: '/admin/dashboard' },
          { label: 'Complaints' },
        ]}
      />

      {/* Server-side search, filters and sorting */}
      <div className="card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2 xl:col-span-3">
            <label className="label-base">
              Search complaints
            </label>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search title, description, category, location..."
            />
          </div>

          <Select
            label="Sort complaints"
            value={sortMode}
            onChange={(event) => {
              setSortMode(event.target.value);
              setPage(1);
            }}
            options={[
              { value: 'createdAt:desc', label: 'Newest first' },
              { value: 'createdAt:asc', label: 'Oldest first' },
              { value: 'priority:desc', label: 'Priority: Highest first' },
              { value: 'priority:asc', label: 'Priority: Lowest first' },
              { value: 'title:asc', label: 'Title: A to Z' },
              { value: 'title:desc', label: 'Title: Z to A' },
              { value: 'category:asc', label: 'Category: A to Z' },
              { value: 'category:desc', label: 'Category: Z to A' },
              { value: 'status:asc', label: 'Status: Ascending' },
              { value: 'status:desc', label: 'Status: Descending' },
            ]}
          />

          <Select
            label="Complaint status"
            placeholder="All statuses"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            options={[
              { value: 'Submitted', label: 'Submitted' },
              { value: 'UnderReview', label: 'Under Review' },
              { value: 'InProgress', label: 'In Progress' },
              { value: 'Resolved', label: 'Resolved' },
              { value: 'Rejected', label: 'Rejected' },
              { value: 'Withdrawn', label: 'Withdrawn' },
            ]}
          />

          <Select
            label="Priority"
            placeholder="All priorities"
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              setPage(1);
            }}
            options={[
              { value: 'Low', label: 'Low' },
              { value: 'Medium', label: 'Medium' },
              { value: 'High', label: 'High' },
              { value: 'Critical', label: 'Critical' },
            ]}
          />

          <Input
            label="Category"
            placeholder="Enter exact category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />

          <Input
            label="Location"
            placeholder="Search location or area"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setCategory('');
              setLocation('');
              setStatus('');
              setPriority('');
              setSortMode('createdAt:desc');
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        </div>
      </div>

      {loading && (
        <p role="status" className="mb-4 text-sm text-ink-500">
          Loading complaints...
        </p>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="card mb-4 space-y-3 p-5"
        >
          <p className="text-sm text-error-600">{error}</p>

          {accessToken && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {!loading && !error && result && (
        <>
          <DataTable
            className="[&_table]:min-w-[1100px] [&_th]:whitespace-nowrap"
            columns={columns}
            rows={result.items}
            rowKey={(item) => item.id}
            onRowClick={(item) => {
              navigate(`/admin/complaints/${item.id}`);
            }}
            emptyState="No complaints found."
          />

          <div className="mt-4 text-sm text-ink-500">
            {result.totalCount === 0
              ? 'No complaints have been submitted.'
              : `Showing ${
                  (result.page - 1) * result.pageSize + 1
                }–${
                  Math.min(
                    result.page * result.pageSize,
                    result.totalCount
                  )
                } of ${result.totalCount} complaints`}
          </div>

          {result.totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
