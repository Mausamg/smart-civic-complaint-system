import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminDashboardStats } from '@/components/complaints/AdminDashboardStats';
import { AdminRecentComplaints } from '@/components/complaints/AdminRecentComplaints';
import { AdminStatusDistribution } from '@/components/complaints/AdminStatusDistribution';
import { AdminCategoryBreakdown } from '@/components/complaints/AdminCategoryBreakdown';
import { AdminMonthlyTrendChart } from '@/components/complaints/AdminMonthlyTrendChart';
import { AdminResolutionMetrics } from '@/components/complaints/AdminResolutionMetrics';
import { useApp } from '@/context/AppContext';
import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminDashboard() {
  const { accessToken } = useApp();

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Municipality-wide overview of complaints, performance, and alerts."
        breadcrumbs={[{ label: 'Admin' }]}
        actions={<Link to="/admin/analytics"><Button variant="outline" leftIcon={<TrendingUp className="h-4 w-4" />}>View analytics</Button></Link>}
      />

      {/* Real administrator statistics */}
      <AdminDashboardStats accessToken={accessToken} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Real monthly complaint submissions */}
          <AdminMonthlyTrendChart accessToken={accessToken} />

          {/* Category + status */}
          <div className="grid gap-6 md:grid-cols-2">
            <AdminStatusDistribution accessToken={accessToken} />
            <AdminCategoryBreakdown accessToken={accessToken} />
          </div>

          <AdminRecentComplaints accessToken={accessToken} />
        </div>

        <div className="space-y-6">
          {/* Real resolution performance */}
          <AdminResolutionMetrics accessToken={accessToken} />

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Quick actions</h3>
            <div className="mt-3 grid gap-2">
              <Link to="/admin/complaints"><Button variant="outline" size="sm" fullWidth>All complaints</Button></Link>
              <Link to="/admin/assignment"><Button variant="outline" size="sm" fullWidth>Assignment queue</Button></Link>
              <Link to="/admin/departments"><Button variant="outline" size="sm" fullWidth>Manage departments</Button></Link>
              <Link to="/admin/escalations"><Button variant="outline" size="sm" fullWidth className="text-error-600">Escalations</Button></Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
