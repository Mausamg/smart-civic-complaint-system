import { Link } from 'react-router-dom';
import { FilePlus2, ListTodo, Clock, AlertTriangle, CheckCircle2, Timer, Megaphone } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, PriorityBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { useApp } from '@/context/AppContext';
import { complaints, announcements } from '@/data/mockData';
import { formatDate, timeAgo } from '@/utils/format';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area,
} from 'recharts';
import { departmentPerformance, monthlyTrend } from '@/data/mockData';

const weeklyData = [
  { day: 'Mon', resolved: 4, assigned: 6 },
  { day: 'Tue', resolved: 7, assigned: 5 },
  { day: 'Wed', resolved: 5, assigned: 8 },
  { day: 'Thu', resolved: 8, assigned: 4 },
  { day: 'Fri', resolved: 6, assigned: 7 },
  { day: 'Sat', resolved: 3, assigned: 2 },
];

export function StaffDashboard() {
  const { user } = useApp();
  const assigned = complaints.filter((c) => c.assignedStaff === user?.name);
  const today = assigned.filter((c) => ['assigned', 'in_progress'].includes(c.status));
  const pending = assigned.filter((c) => c.status === 'assigned').length;
  const highPriority = assigned.filter((c) => ['high', 'urgent'].includes(c.priority)).length;
  const overdue = assigned.filter((c) => +new Date(c.dueDate) < Date.now() && !['resolved', 'closed', 'rejected'].includes(c.status)).length;
  const completed = assigned.filter((c) => ['resolved', 'closed'].includes(c.status)).length;
  const ann = announcements[0];

  return (
    <div>
      <PageHeader
        title={`Hello, ${user?.name.split(' ')[0]}`}
        subtitle={`You have ${today.length} complaints in your work queue today.`}
        breadcrumbs={[{ label: 'Staff Dashboard' }]}
        actions={<Link to="/staff/assigned"><Button leftIcon={<ListTodo className="h-4 w-4" />}>View assigned</Button></Link>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Assigned Today" value={today.length} icon="ListTodo" iconBg="blue" />
        <StatCard label="Pending" value={pending} icon="Clock" iconBg="amber" />
        <StatCard label="High Priority" value={highPriority} icon="AlertTriangle" iconBg="red" />
        <StatCard label="Overdue" value={overdue} icon="Timer" iconBg="orange" />
        <StatCard label="Completed" value={completed} icon="CheckCircle2" iconBg="green" />
        <StatCard label="Avg Resolution" value="5.2d" icon="TrendingUp" iconBg="teal" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Work queue */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Daily work queue</h3>
              <Link to="/staff/queue" className="text-xs font-medium text-primary-600 hover:underline">View all →</Link>
            </div>
            <div className="mt-4 space-y-3">
              {today.slice(0, 4).map((c) => (
                <Link key={c.id} to={`/staff/complaints/${c.id}`} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-ink-800 dark:hover:bg-primary-950/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={c.category} />
                      <PriorityBadge priority={c.priority} />
                    </div>
                    <p className="mt-1.5 truncate text-sm font-medium text-ink-900 dark:text-ink-100">{c.title}</p>
                    <p className="text-xs text-ink-500">{c.trackingId} · Due {formatDate(c.dueDate)}</p>
                  </div>
                  <StatusBadge status={c.status} size="sm" />
                </Link>
              ))}
              {today.length === 0 && <p className="rounded-xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-400 dark:bg-ink-800/50">No active complaints in your queue.</p>}
            </div>
          </Card>

          {/* Performance chart */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">This week's performance</h3>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#67718c' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#67718c' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="assigned" name="Assigned" fill="#3478f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Recent updates */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Recent complaint updates</h3>
            <div className="mt-3 space-y-2">
              {complaints.slice(0, 4).map((c) => (
                <Link key={c.id} to={`/staff/complaints/${c.id}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-800/50">
                  <span className="min-w-0 flex-1 truncate text-ink-700 dark:text-ink-200">{c.title}</span>
                  <span className="ml-3 shrink-0 text-xs text-ink-400">{timeAgo(c.lastUpdate)}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-ink-100"><Megaphone className="h-4 w-4 text-primary-600" /> Department announcements</h3>
            <div className="mt-3 rounded-xl border border-primary-100 bg-primary-50/50 p-4 dark:border-primary-900 dark:bg-primary-950/20">
              <p className="text-xs font-semibold uppercase text-primary-600">{ann.category}</p>
              <p className="mt-1 text-sm font-semibold text-ink-900 dark:text-ink-100">{ann.title}</p>
              <p className="mt-1 line-clamp-3 text-xs text-ink-500">{ann.body}</p>
              <p className="mt-2 text-[10px] text-ink-400">{formatDate(ann.publishedAt)}</p>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Monthly trend</h3>
            <div className="mt-3 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend.slice(-6)}>
                  <defs>
                    <linearGradient id="staffG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#67718c' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} fill="url(#staffG)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Department workload</h3>
            <div className="mt-3 space-y-2">
              {departmentPerformance.slice(0, 5).map((d) => (
                <div key={d.dept} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-600 dark:text-ink-300">{d.dept}</span>
                    <span className="font-medium text-ink-900 dark:text-ink-100">{d.active} active</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min(100, (d.active / 54) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
