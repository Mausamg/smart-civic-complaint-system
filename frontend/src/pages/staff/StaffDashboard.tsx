import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { StaffDashboardStats } from '@/components/complaints/StaffDashboardStats';
import { StaffRecentComplaints } from '@/components/complaints/StaffRecentComplaints';
import { StaffWeeklyTrendChart } from '@/components/complaints/StaffWeeklyTrendChart';
import { StaffMonthlyTrendChart } from '@/components/complaints/StaffMonthlyTrendChart';
import { StaffCategoryBreakdown } from '@/components/complaints/StaffCategoryBreakdown';
import { StaffLatestNotifications } from '@/components/complaints/StaffLatestNotifications';
import { StaffWorkQueue } from '@/components/complaints/StaffWorkQueue';
import { useApp } from '@/context/AppContext';
import { ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';

export function StaffDashboard() {
  const { user, accessToken } = useApp();

  return (
    <div>
      <PageHeader
        title={`Hello, ${user?.name.split(' ')[0]}`}
        subtitle="Your assigned complaints overview and work queue."
        breadcrumbs={[{ label: 'Staff Dashboard' }]}
        actions={<Link to="/staff/assigned"><Button leftIcon={<ListTodo className="h-4 w-4" />}>View assigned</Button></Link>}
      />

      <StaffDashboardStats accessToken={accessToken} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <StaffWorkQueue accessToken={accessToken} />

          <StaffWeeklyTrendChart accessToken={accessToken} />

          <StaffRecentComplaints accessToken={accessToken} />
        </div>

        <div className="space-y-6">
          <StaffLatestNotifications accessToken={accessToken} />

          <StaffMonthlyTrendChart accessToken={accessToken} />

          <StaffCategoryBreakdown accessToken={accessToken} />
        </div>
      </div>
    </div>
  );
}
