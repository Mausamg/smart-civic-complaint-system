import { Link } from 'react-router-dom';
import { AlertTriangle, TrendingUp, Star, Users, FileText, CheckCircle2, RotateCcw, Ban, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { complaints, platformStats, monthlyTrend, statusDistribution, categoryBreakdown, departmentPerformance, wardComplaints } from '@/data/mockData';
import { formatDate, timeAgo, formatNumber } from '@/utils/format';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

const wardData = [
  { ward: 'W1', complaints: 180 }, { ward: 'W3', complaints: 240 }, { ward: 'W5', complaints: 320 },
  { ward: 'W7', complaints: 410 }, { ward: 'W10', complaints: 290 }, { ward: 'W11', complaints: 350 }, { ward: 'W15', complaints: 210 },
];

export function AdminDashboard() {
  const critical = complaints.filter((c) => c.priority === 'urgent' && !['resolved', 'closed', 'rejected'].includes(c.status));

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Municipality-wide overview of complaints, performance, and alerts."
        breadcrumbs={[{ label: 'Admin' }]}
        actions={<Link to="/admin/analytics"><Button variant="outline" leftIcon={<TrendingUp className="h-4 w-4" />}>View analytics</Button></Link>}
      />

      {/* Critical alerts */}
      {critical.length > 0 && (
        <div className="mb-6 rounded-2xl border border-error-200 bg-error-50 p-4 dark:border-error-900 dark:bg-error-950/30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-error-600" />
            <p className="text-sm font-semibold text-error-800 dark:text-error-300">{critical.length} critical complaints require attention</p>
          </div>
          <div className="mt-3 space-y-2">
            {critical.map((c) => (
              <Link key={c.id} to={`/admin/complaints/${c.id}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm transition hover:shadow-soft dark:bg-ink-900">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900 dark:text-ink-100">{c.title}</p>
                  <p className="text-xs text-ink-500">{c.trackingId} · {c.ward} · {timeAgo(c.submittedAt)}</p>
                </div>
                <PriorityBadge priority={c.priority} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="Total Complaints" value={formatNumber(platformStats.totalComplaints)} icon="FileText" iconBg="blue" trend={{ value: '8% vs last month', up: true }} />
        <StatCard label="Active" value={formatNumber(platformStats.activeComplaints)} icon="Clock" iconBg="amber" />
        <StatCard label="Resolved" value={formatNumber(platformStats.resolvedComplaints)} icon="CheckCircle2" iconBg="green" trend={{ value: '12% vs last month', up: true }} />
        <StatCard label="Overdue" value={23} icon="AlertTriangle" iconBg="red" />
        <StatCard label="Satisfaction" value={`${platformStats.satisfactionScore}★`} icon="Star" iconBg="teal" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New Today" value={42} icon="FileText" iconBg="blue" />
        <StatCard label="Rejected" value={142} icon="Ban" iconBg="slate" />
        <StatCard label="Reopened" value={78} icon="RotateCcw" iconBg="purple" />
        <StatCard label="Avg Response" value="2.4h" icon="Timer" iconBg="orange" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Trend */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Complaint trends</h3>
              <span className="text-xs text-ink-400">Submitted vs Resolved · last 12 months</span>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="aSub" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3478f6" stopOpacity={0.3} /><stop offset="100%" stopColor="#3478f6" stopOpacity={0} /></linearGradient>
                    <linearGradient id="aRes" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#67718c' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#67718c' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Area type="monotone" dataKey="submitted" stroke="#3478f6" strokeWidth={2} fill="url(#aSub)" name="Submitted" />
                  <Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} fill="url(#aRes)" name="Resolved" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Category + status */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Status distribution</h3>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                      {statusDistribution.map((e) => <Cell key={e.name} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {statusDistribution.slice(0, 6).map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-ink-600 dark:text-ink-300">{s.name}</span>
                    <span className="ml-auto font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Category breakdown</h3>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBreakdown} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#67718c' }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#3478f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Recent activity */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Recent system activity</h3>
            <div className="mt-3 space-y-2">
              {complaints.slice(0, 5).map((c) => (
                <Link key={c.id} to={`/admin/complaints/${c.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-ink-50 dark:hover:bg-ink-800/50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900 dark:text-ink-100">{c.title}</p>
                    <p className="text-xs text-ink-500">{c.trackingId} · {c.ward} · {timeAgo(c.lastUpdate)}</p>
                  </div>
                  <StatusBadge status={c.status} size="sm" />
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Department performance radar */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Department performance</h3>
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={departmentPerformance}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="dept" tick={{ fontSize: 10, fill: '#67718c' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: '#67718c' }} />
                  <Radar name="Resolved" dataKey="resolved" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Radar name="Active" dataKey="active" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Ward chart */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Ward-wise complaints</h3>
            <div className="mt-4 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wardData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="ward" tick={{ fontSize: 10, fill: '#67718c' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#67718c' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="complaints" radius={[4, 4, 0, 0]} fill="#3478f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Quick actions</h3>
            <div className="mt-3 grid gap-2">
              <Link to="/admin/complaints"><Button variant="outline" size="sm" fullWidth>All complaints</Button></Link>
              <Link to="/admin/assignment"><Button variant="outline" size="sm" fullWidth>Assignment queue</Button></Link>
              <Link to="/admin/departments"><Button variant="outline" size="sm" fullWidth>Manage departments</Button></Link>
              <Link to="/admin/escalations"><Button variant="outline" size="sm" fullWidth className="text-error-600">Escalations ({critical.length})</Button></Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
