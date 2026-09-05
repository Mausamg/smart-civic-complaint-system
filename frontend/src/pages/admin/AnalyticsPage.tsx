import { useState } from 'react';
import { Download, FileText, Printer, Filter } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Form';
import { StatCard } from '@/components/ui/StatCard';
import { useApp } from '@/context/AppContext';
import {
  monthlyTrend, statusDistribution, categoryBreakdown, wardComplaints, departmentPerformance,
  resolutionTimeData, satisfactionTrend,
} from '@/data/mockData';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

export function AnalyticsPage() {
  const { addToast } = useApp();
  const [range, setRange] = useState('year');
  const [ward, setWard] = useState('');
  const [dept, setDept] = useState('');

  const exportMenu = (type: string) => addToast({ type: 'success', title: `${type} export started`, message: 'Your report is being generated.' });

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Comprehensive insights into complaint volumes, performance, and satisfaction."
        breadcrumbs={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Analytics' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={<Printer className="h-4 w-4" />} onClick={() => exportMenu('Print')}>Print</Button>
            <Button variant="outline" size="sm" leftIcon={<FileText className="h-4 w-4" />} onClick={() => exportMenu('PDF')}>PDF</Button>
            <Button size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={() => exportMenu('CSV')}>Export</Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Date range" value={range} onChange={(e) => setRange(e.target.value)} options={[
            { value: 'week', label: 'Last 7 days' }, { value: 'month', label: 'Last 30 days' }, { value: 'quarter', label: 'Last quarter' }, { value: 'year', label: 'Last 12 months' },
          ]} className="w-auto" />
          <Select label="Ward" value={ward} onChange={(e) => setWard(e.target.value)} placeholder="All wards" options={[{ value: 'W7', label: 'Ward 7' }, { value: 'W5', label: 'Ward 5' }]} className="w-auto" />
          <Select label="Department" value={dept} onChange={(e) => setDept(e.target.value)} placeholder="All departments" options={[{ value: 'roads', label: 'Roads' }, { value: 'sanitation', label: 'Sanitation' }]} className="w-auto" />
          <Select label="Status" placeholder="All statuses" options={[{ value: 'resolved', label: 'Resolved' }, { value: 'in_progress', label: 'In Progress' }]} className="w-auto" />
        </div>
      </Card>

      {/* Summary stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Complaints" value="4,827" icon="FileText" iconBg="blue" trend={{ value: '8%', up: true }} />
        <StatCard label="Resolution Rate" value="66%" icon="CheckCircle2" iconBg="green" trend={{ value: '3%', up: true }} />
        <StatCard label="Avg Resolution" value="5.2d" icon="Clock" iconBg="amber" trend={{ value: '0.4d', up: false }} />
        <StatCard label="Satisfaction" value="4.3★" icon="Star" iconBg="teal" trend={{ value: '0.2', up: true }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Complaint trend — submitted vs resolved</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="an1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3478f6" stopOpacity={0.3} /><stop offset="100%" stopColor="#3478f6" stopOpacity={0} /></linearGradient>
                  <linearGradient id="an2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#67718c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#67718c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="submitted" stroke="#3478f6" strokeWidth={2} fill="url(#an1)" name="Submitted" />
                <Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} fill="url(#an2)" name="Resolved" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status distribution */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Status distribution</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {statusDistribution.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Category */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Category breakdown</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#67718c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#67718c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#3478f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Ward-wise */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Ward-wise complaints</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardComplaints}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="ward" tick={{ fontSize: 11, fill: '#67718c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#67718c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="complaints" radius={[6, 6, 0, 0]} fill="#14b8a6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Department performance */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Department performance</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={departmentPerformance}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="dept" tick={{ fontSize: 11, fill: '#67718c' }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: '#67718c' }} />
                <Radar name="Resolved" dataKey="resolved" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Radar name="Active" dataKey="active" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Resolution time */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Average resolution time (days)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resolutionTimeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#67718c' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: '#67718c' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="days" radius={[0, 6, 6, 0]} fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Satisfaction trend */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Citizen satisfaction trend</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={satisfactionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#67718c' }} axisLine={false} tickLine={false} />
                <YAxis domain={[3.5, 5]} tick={{ fontSize: 11, fill: '#67718c' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4 }} name="Satisfaction" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
