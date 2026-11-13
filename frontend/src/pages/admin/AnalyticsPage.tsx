import { useState } from 'react';
import { Download, FileBarChart2, Printer } from 'lucide-react';

import { AdminDashboardStats } from '@/components/complaints/AdminDashboardStats';
import { AdminMonthlyTrendChart } from '@/components/complaints/AdminMonthlyTrendChart';
import { AdminStatusDistribution } from '@/components/complaints/AdminStatusDistribution';
import { AdminCategoryBreakdown } from '@/components/complaints/AdminCategoryBreakdown';
import { AdminResolutionMetrics } from '@/components/complaints/AdminResolutionMetrics';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { useApp } from '@/context/AppContext';

import {
  getDashboardStats,
  getDashboardMonthlyTrend,
  getDashboardStatusBreakdown,
  getDashboardCategoryBreakdown,
  getDashboardResolutionMetrics,
} from '@/services/dashboardService';

type CsvRow = Array<string | number>;

export function AnalyticsPage() {
  const { accessToken, role, addToast } = useApp();
  const [exporting, setExporting] = useState(false);

  const isAdmin = role === 'admin';

  const downloadCsv = async () => {
    if (!accessToken || exporting) return;

    setExporting(true);

    try {
      const [
        stats,
        months,
        statuses,
        categories,
        resolution,
      ] = await Promise.all([
        getDashboardStats(accessToken),
        getDashboardMonthlyTrend(accessToken),
        getDashboardStatusBreakdown(accessToken),
        getDashboardCategoryBreakdown(accessToken),
        isAdmin
          ? getDashboardResolutionMetrics(accessToken)
          : Promise.resolve(null),
      ]);

      const rows: CsvRow[] = [
        ['Section', 'Metric', 'Value'],
        ['Summary', 'Total complaints', stats.totalComplaints],
        ['Summary', 'Submitted', stats.submitted],
        ['Summary', 'Under review', stats.underReview],
        ['Summary', 'In progress', stats.inProgress],
        ['Summary', 'Resolved', stats.resolved],
        ['Summary', 'Rejected', stats.rejected],
        ['Summary', 'High priority', stats.highPriority],
        ['Summary', 'Unassigned', stats.unassigned],
        ...months.map(
          (item): CsvRow => [
            'Monthly submissions',
            `${item.year}-${String(item.month).padStart(2, '0')}`,
            item.count,
          ]
        ),
        ...statuses.map(
          (item): CsvRow => [
            'Status breakdown',
            item.status,
            item.count,
          ]
        ),
        ...categories.map(
          (item): CsvRow => [
            'Category breakdown',
            item.category,
            item.count,
          ]
        ),
      ];

      if (resolution) {
        rows.push(
          ['Resolution', 'Eligible complaints', resolution.totalComplaints],
          ['Resolution', 'Resolved complaints', resolution.resolvedComplaints],
          ['Resolution', 'Resolution rate (%)', resolution.resolutionRate],
          ['Resolution', 'Average resolution hours', resolution.averageResolutionTimeHours]
        );
      }

      const csv = rows
        .map((row) =>
          row
            .map((value) =>
              `"${String(value).replace(/"/g, '""')}"`
            )
            .join(',')
        )
        .join('\r\n');

      const blob = new Blob(
        ['\uFEFF', csv],
        { type: 'text/csv;charset=utf-8;' }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download =
        `civiclink-${isAdmin ? 'admin' : 'staff'}-analytics-` +
        `${new Date().toISOString().slice(0, 10)}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(
        () => URL.revokeObjectURL(url),
        1000
      );

      addToast({
        type: 'success',
        title: 'CSV report ready',
        message: 'Report exported using live backend statistics.',
      });
    } catch (err: unknown) {
      addToast({
        type: 'error',
        title: 'Export failed',
        message: err instanceof Error
          ? err.message
          : 'Unable to export report data.',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle={
          isAdmin
            ? 'Live municipality-wide complaint and resolution insights.'
            : 'Live reports for complaints assigned to you.'
        }
        breadcrumbs={[
          {
            label: isAdmin ? 'Admin' : 'Staff',
            to: isAdmin
              ? '/admin/dashboard'
              : '/staff/dashboard',
          },
          { label: 'Analytics' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => window.print()}
            >
              Print / Save PDF
            </Button>

            <Button
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              disabled={!accessToken || exporting}
              loading={exporting}
              onClick={() => void downloadCsv()}
            >
              Download CSV
            </Button>
          </div>
        }
      />

      <Card className="mb-6 border-primary-100 bg-primary-50/40 p-4 dark:border-primary-900 dark:bg-primary-950/20">
        <div className="flex items-start gap-3">
          <FileBarChart2
            className="mt-0.5 h-5 w-5 shrink-0 text-primary-600"
            aria-hidden="true"
          />

          <div>
            <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">
              Live reporting
            </p>

            <p className="mt-1 text-xs leading-5 text-ink-600 dark:text-ink-300">
              Summary statistics reflect current records.
              Monthly submissions cover the latest six calendar
              months. Charts and CSV exports use real API data,
              not demonstration values.
            </p>
          </div>
        </div>
      </Card>

      <section className="mb-6" aria-label="Complaint overview">
        <h2 className="mb-4 text-base font-semibold text-ink-900 dark:text-ink-100">
          Complaint overview
        </h2>

        <AdminDashboardStats accessToken={accessToken} />
      </section>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <AdminMonthlyTrendChart accessToken={accessToken} />
        </div>

        <AdminStatusDistribution accessToken={accessToken} />
        <AdminCategoryBreakdown accessToken={accessToken} />
      </div>

      {isAdmin && (
        <section className="mb-6" aria-label="Resolution performance">
          <h2 className="mb-4 text-base font-semibold text-ink-900 dark:text-ink-100">
            Resolution performance
          </h2>

          <div className="max-w-2xl">
            <AdminResolutionMetrics accessToken={accessToken} />
          </div>
        </section>
      )}

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
          Reporting scope
        </h2>

        <p className="mt-2 text-sm leading-6 text-ink-600 dark:text-ink-300">
          {isAdmin
            ? 'This report covers complaints across the municipality.'
            : 'This report covers complaints assigned to your account.'}
          {' '}
          Ward-level analytics, department performance,
          satisfaction scoring, and custom date-range
          filtering require additional backend reporting
          functionality and are not included in these figures.
        </p>
      </Card>
    </div>
  );
}
