import { Link } from 'react-router-dom';
import { FilePlus2, ArrowRight, Bell, AlertTriangle, Megaphone, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ComplaintCard } from '@/components/complaints/ComplaintCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useApp } from '@/context/AppContext';
import { complaints, notifications, announcements } from '@/data/mockData';
import { timeAgo, formatDate } from '@/utils/format';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { statusDistribution, monthlyTrend } from '@/data/mockData';

export function CitizenDashboard() {
  const { user } = useApp();
  const myComplaints = complaints.filter((c) => c.citizen.id === 'u-citizen-1');
  const pending = myComplaints.filter((c) => ['submitted', 'under_review', 'assigned'].includes(c.status)).length;
  const inProgress = myComplaints.filter((c) => c.status === 'in_progress').length;
  const resolved = myComplaints.filter((c) => ['resolved', 'closed'].includes(c.status)).length;
  const recent = [...myComplaints].sort((a, b) => +new Date(b.lastUpdate) - +new Date(a.lastUpdate)).slice(0, 3);
  const featuredAnn = announcements.find((a) => a.featured) || announcements[0];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        subtitle={`Here is an overview of your civic complaints in ${user?.ward}.`}
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={<Link to="/citizen/report"><Button leftIcon={<FilePlus2 className="h-4 w-4" />}>Report New Complaint</Button></Link>}
      />

      {/* Emergency notice */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-error-200 bg-error-50 p-4 dark:border-error-900 dark:bg-error-950/30">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error-600" />
        <div className="text-sm text-error-800 dark:text-error-300">
          <p className="font-semibold">Emergency reporting notice</p>
          <p className="mt-0.5">This system is not for emergencies. For urgent safety issues call Police 100, Ambulance 102, or Fire 101.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Complaints" value={myComplaints.length} icon="FileText" iconBg="blue" />
        <StatCard label="Pending" value={pending} icon="Clock" iconBg="amber" />
        <StatCard label="In Progress" value={inProgress} icon="Loader" iconBg="purple" />
        <StatCard label="Resolved" value={resolved} icon="CheckCircle2" iconBg="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Chart */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Complaint status overview</h3>
              <span className="flex items-center gap-1 text-xs text-success-600"><TrendingUp className="h-3.5 w-3.5" /> +12% this month</span>
            </div>
            <div className="mt-4 grid items-center gap-4 sm:grid-cols-2">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {statusDistribution.map((e) => <Cell key={e.name} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {statusDistribution.slice(0, 5).map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}
                    </span>
                    <span className="font-semibold text-ink-900 dark:text-ink-100">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Recent complaints */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Recent activity</h3>
              <Link to="/citizen/complaints" className="text-xs font-medium text-primary-600 hover:underline">View all →</Link>
            </div>
            <div className="mt-4 space-y-3">
              {recent.map((c) => (
                <Link key={c.id} to={`/citizen/complaints/${c.id}`} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-ink-800 dark:hover:bg-primary-950/20">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900 dark:text-ink-100">{c.title}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{c.trackingId} · Updated {timeAgo(c.lastUpdate)}</p>
                  </div>
                  <StatusBadge status={c.status} size="sm" />
                </Link>
              ))}
            </div>
          </Card>

          {/* Recently submitted */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Recently submitted</h3>
              <Link to="/citizen/report" className="text-xs font-medium text-primary-600 hover:underline">Report new →</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {recent.slice(0, 2).map((c) => (
                <ComplaintCard key={c.id} complaint={c} linkTo={`/citizen/complaints/${c.id}`} showComments />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Announcements */}
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Announcements</h3>
            </div>
            <Link to="/citizen/announcements" className="mt-3 block rounded-xl border border-primary-100 bg-primary-50/50 p-4 transition hover:border-primary-300 dark:border-primary-900 dark:bg-primary-950/20">
              <p className="text-xs font-semibold uppercase text-primary-600">{featuredAnn.category}</p>
              <p className="mt-1 text-sm font-semibold text-ink-900 dark:text-ink-100">{featuredAnn.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-ink-500">{featuredAnn.body}</p>
              <p className="mt-2 text-[10px] text-ink-400">{formatDate(featuredAnn.publishedAt)}</p>
            </Link>
            <Link to="/citizen/announcements" className="mt-3 block text-center text-xs font-medium text-primary-600 hover:underline">View all announcements</Link>
          </Card>

          {/* Notifications */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary-600" />
                <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Notifications</h3>
              </div>
              <span className="rounded-full bg-error-500 px-1.5 text-[10px] font-bold text-white">{notifications.filter((n) => !n.read).length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {notifications.slice(0, 4).map((n) => (
                <Link key={n.id} to={n.link || '#'} className={`flex gap-2.5 rounded-xl p-2.5 transition hover:bg-ink-50 dark:hover:bg-ink-800/50 ${!n.read ? 'bg-primary-50/40 dark:bg-primary-950/20' : ''}`}>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                  <div className={n.read ? 'pl-4.5 min-w-0' : 'min-w-0'}>
                    <p className="text-xs font-medium text-ink-900 dark:text-ink-100">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-500">{n.message}</p>
                    <p className="mt-1 text-[10px] text-ink-400">{timeAgo(n.timestamp)}</p>
                  </div>
                </Link>
              ))}
            </div>
            <Link to="/citizen/notifications" className="mt-3 block text-center text-xs font-medium text-primary-600 hover:underline">View all</Link>
          </Card>

          {/* Quick links */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Quick links</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'My Complaints', to: '/citizen/complaints', icon: 'ListTodo' },
                { label: 'Track', to: '/track', icon: 'Search' },
                { label: 'Public Map', to: '/map', icon: 'Map' },
                { label: 'Feedback', to: '/citizen/feedback', icon: 'MessageSquare' },
              ].map((q) => (
                <Link key={q.to} to={q.to} className="flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2.5 text-xs font-medium text-ink-700 transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-ink-800 dark:text-ink-200 dark:hover:bg-primary-950/20">
                  <ArrowRight className="h-3.5 w-3.5 text-primary-500" /> {q.label}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
