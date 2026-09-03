import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Search, FileText, Eye, UserCheck, CheckCircle2, MapPin,
  Star, ShieldCheck, Clock, TrendingUp, Users, Building2, Smartphone,
  ChevronDown, Quote, Smartphone as Phone, Bell,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CategoryBadge } from '../../components/ui/StatusBadge';
import { AccordionItem } from '../../components/ui/Accordion';
import { platformStats, recentResolvedPublic, testimonials, faqItems, monthlyTrend, categoryBreakdown } from '../../data/mockData';
import { categoryConfig } from '../../data/metadata';
import { formatNumber } from '../../utils/format';
import { Icon } from '../../components/ui/Icon';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid,
} from 'recharts';

const steps = [
  { icon: 'FileText', title: 'Report the Issue', desc: 'Submit a complaint with photos, location, and details in minutes.' },
  { icon: 'Eye', title: 'Authority Reviews', desc: 'Municipal staff verify and assign your complaint to the right department.' },
  { icon: 'TrendingUp', title: 'Track Progress', desc: 'Follow real-time status updates and communicate with the assigned team.' },
  { icon: 'CheckCircle2', title: 'Issue Resolved', desc: 'Confirm the resolution and rate the service you received.' },
];

const stats = [
  { label: 'Total Complaints', value: platformStats.totalComplaints, icon: 'FileText', color: 'blue' },
  { label: 'Resolved', value: platformStats.resolvedComplaints, icon: 'CheckCircle2', color: 'green' },
  { label: 'Active', value: platformStats.activeComplaints, icon: 'Clock', color: 'amber' },
  { label: 'Avg. Resolution', value: `${platformStats.averageResolutionDays}d`, icon: 'TrendingUp', color: 'teal' },
];

const categories = Object.entries(categoryConfig).slice(0, 8);

export function LandingPage() {
  const [trackId, setTrackId] = useState('');
  const navigate = useNavigate();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackId.trim()) navigate(`/track?id=${encodeURIComponent(trackId.trim())}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50/60 via-white to-white dark:from-primary-950/20 dark:via-ink-950 dark:to-ink-950">
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
          <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-accent-200/30 blur-3xl" />
        </div>
        <div className="container-page relative py-16 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="animate-slide-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:border-primary-900 dark:bg-primary-950/40 dark:text-primary-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Trusted by {formatNumber(platformStats.citizensRegistered)}+ citizens
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-ink-900 sm:text-5xl dark:text-ink-100">
                Report Civic Issues. <br />
                <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">Track Progress.</span> Improve Your Community.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-ink-600 dark:text-ink-300">
                A transparent platform to report potholes, waste, streetlights, water leaks, and more. See real progress, hold authorities accountable, and build a better neighbourhood.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/report">
                  <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>Report an Issue</Button>
                </Link>
                <Link to="/track">
                  <Button variant="outline" size="lg" leftIcon={<Search className="h-4 w-4" />}>Track Complaint</Button>
                </Link>
              </div>

              <form onSubmit={handleTrack} className="mt-6 max-w-md">
                <label htmlFor="track" className="sr-only">Track complaint by ID</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      id="track"
                      value={trackId}
                      onChange={(e) => setTrackId(e.target.value)}
                      placeholder="Enter tracking ID e.g. KMC-2024-001284"
                      className="input-base h-11 pl-10"
                    />
                  </div>
                  <Button type="submit" size="lg">Track</Button>
                </div>
              </form>
            </div>

            <div className="relative animate-scale-in">
              <Card className="overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3 dark:border-ink-800">
                  <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">Live Complaint Activity</p>
                  <span className="flex items-center gap-1.5 text-xs text-success-600">
                    <span className="h-2 w-2 animate-pulse-soft rounded-full bg-success-500" /> Live
                  </span>
                </div>
                <div className="h-44 px-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend.slice(-8)}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3478f6" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#3478f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#67718c' }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                      <Area type="monotone" dataKey="submitted" stroke="#3478f6" strokeWidth={2} fill="url(#g1)" name="Submitted" />
                      <Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} fill="url(#g2)" name="Resolved" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 divide-x divide-ink-100 border-t border-ink-100 dark:divide-ink-800 dark:border-ink-800">
                  <div className="px-3 py-3 text-center">
                    <p className="text-lg font-bold text-primary-600">{formatNumber(platformStats.resolvedComplaints)}</p>
                    <p className="text-[11px] text-ink-500">Resolved</p>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <p className="text-lg font-bold text-success-600">{platformStats.averageResolutionDays}d</p>
                    <p className="text-[11px] text-ink-500">Avg time</p>
                  </div>
                  <div className="px-3 py-3 text-center">
                    <p className="text-lg font-bold text-accent-600">{platformStats.satisfactionScore}</p>
                    <p className="text-[11px] text-ink-500">Rating</p>
                  </div>
                </div>
              </Card>
              <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-ink-100 bg-white p-3 shadow-float sm:block dark:border-ink-800 dark:bg-ink-900">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success-100 text-success-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-900 dark:text-ink-100">Complaint Resolved</p>
                    <p className="text-[10px] text-ink-500">Garbage — Ward 5 · 2 days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="container-page py-10">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/40">
                  <Icon name={s.icon} className="h-6 w-6" />
                </div>
                <p className="text-3xl font-bold tracking-tight text-ink-900 dark:text-ink-100">
                  {typeof s.value === 'number' ? formatNumber(s.value) : s.value}
                </p>
                <p className="mt-1 text-sm text-ink-500">{s.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">How It Works</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink-900 dark:text-ink-100">From complaint to resolution in 4 steps</h2>
          <p className="mt-3 text-ink-600 dark:text-ink-300">A simple, transparent process that keeps you informed at every stage.</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Card key={s.title} className="relative p-6">
              <span className="absolute right-5 top-5 text-5xl font-bold text-ink-100 dark:text-ink-800">{i + 1}</span>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-sm">
                <Icon name={s.icon} className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-ink-900 dark:text-ink-100">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ink-500">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="border-y border-ink-100 bg-ink-50/50 py-16 dark:border-ink-800 dark:bg-ink-900/30">
        <div className="container-page">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Categories</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink-900 dark:text-ink-100">Popular complaint types</h2>
            </div>
            <Link to="/report" className="hidden shrink-0 text-sm font-medium text-primary-600 hover:underline sm:block">
              Report now →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map(([key, cfg]) => (
              <Link key={key} to="/report" className="focus-visible:ring-2 focus-visible:ring-primary-500 rounded-2xl">
                <Card hover className="flex items-center gap-3 p-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cfg.bg} ${cfg.text}`}>
                    <Icon name={cfg.icon} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">{cfg.label}</p>
                    <p className="truncate text-xs text-ink-500">{cfg.department}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recently resolved */}
      <section className="container-page py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-success-600">Recently Resolved</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink-900 dark:text-ink-100">Issues fixed this week</h2>
          </div>
          <Link to="/map" className="hidden shrink-0 text-sm font-medium text-primary-600 hover:underline sm:block">
            View public map →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {recentResolvedPublic.map((c) => (
            <Card key={c.id} hover className="overflow-hidden p-0">
              <div className="relative h-36">
                <img src={c.evidence[0]?.url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
                <div className="absolute left-3 top-3">
                  <CategoryBadge category={c.category} />
                </div>
                <div className="absolute right-3 top-3">
                  <StatusBadge status={c.status} size="sm" />
                </div>
              </div>
              <div className="p-4">
                <p className="text-[11px] font-medium text-ink-400">{c.trackingId}</p>
                <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-ink-900 dark:text-ink-100">{c.title}</h3>
                <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {c.ward}</span>
                  {c.rating && (
                    <span className="flex items-center gap-1 text-warning-600">
                      <Star className="h-3.5 w-3.5 fill-warning-400 text-warning-400" /> {c.rating}.0
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Community impact */}
      <section className="border-y border-ink-100 bg-gradient-to-br from-primary-600 to-accent-700 py-16 text-white dark:border-ink-800">
        <div className="container-page">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-white/80">Community Impact</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Together we are making a difference</h2>
              <p className="mt-3 max-w-lg text-white/85">
                Every report helps improve your neighbourhood. See how citizen participation has driven real change across the municipality.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-3xl font-bold">{formatNumber(platformStats.citizensRegistered)}</p>
                  <p className="mt-1 text-sm text-white/80">Active citizens</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{platformStats.wards}</p>
                  <p className="mt-1 text-sm text-white/80">Wards covered</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{Math.round((platformStats.resolvedComplaints / platformStats.totalComplaints) * 100)}%</p>
                  <p className="mt-1 text-sm text-white/80">Resolution rate</p>
                </div>
              </div>
            </div>
            <Card className="bg-white/10 p-6 backdrop-blur border-white/20">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.8)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} contentStyle={{ borderRadius: 12, border: 'none', background: 'rgba(15,23,42,0.9)', color: '#fff', fontSize: 12 }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="rgba(255,255,255,0.85)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-center text-xs text-white/70">Complaints by category this year</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-page py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Citizen Feedback</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink-900 dark:text-ink-100">What citizens are saying</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.id} className="p-6">
              <Quote className="h-8 w-8 text-primary-200" />
              <p className="mt-3 text-sm leading-relaxed text-ink-700 dark:text-ink-200">"{t.quote}"</p>
              <div className="mt-5 flex items-center gap-3">
                <img src={t.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{t.name}</p>
                  <p className="text-xs text-ink-500">{t.ward}</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-warning-400 text-warning-400" />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Mobile app promo */}
      <section className="container-page pb-16">
        <Card className="overflow-hidden p-0">
          <div className="grid items-center gap-8 bg-gradient-to-br from-ink-900 to-primary-950 p-8 text-white lg:grid-cols-2 lg:p-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                <Smartphone className="h-3.5 w-3.5" /> Mobile App
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">Report on the go</h2>
              <p className="mt-3 max-w-md text-white/80">
                Download the CivicLink mobile app to report issues with your camera, get push notifications, and track complaints anywhere.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="flex h-12 items-center gap-2 rounded-xl bg-white/10 px-4 backdrop-blur hover:bg-white/20 cursor-pointer">
                  <Phone className="h-5 w-5" />
                  <div>
                    <p className="text-[10px] text-white/70">Download on</p>
                    <p className="text-sm font-semibold">App Store</p>
                  </div>
                </div>
                <div className="flex h-12 items-center gap-2 rounded-xl bg-white/10 px-4 backdrop-blur hover:bg-white/20 cursor-pointer">
                  <Phone className="h-5 w-5" />
                  <div>
                    <p className="text-[10px] text-white/70">Get it on</p>
                    <p className="text-sm font-semibold">Google Play</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative h-64 w-32 rounded-3xl border-4 border-white/20 bg-white/5 p-2 backdrop-blur">
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-primary-500/20 to-accent-500/20">
                  <Bell className="h-8 w-8 text-white/80" />
                  <p className="px-3 text-center text-xs text-white/70">Push notifications for status updates</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* FAQ preview */}
      <section className="border-t border-ink-100 bg-ink-50/50 py-16 dark:border-ink-800 dark:bg-ink-900/30">
        <div className="container-page">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">FAQ</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink-900 dark:text-ink-100">Frequently asked questions</h2>
            </div>
            <Link to="/faq" className="hidden shrink-0 text-sm font-medium text-primary-600 hover:underline sm:block">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid gap-3 lg:grid-cols-2">
            {faqItems.slice(0, 4).map((f) => (
              <AccordionItem key={f.id} question={f.question} answer={f.answer} />
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link to="/faq">
              <Button variant="outline">View all FAQs</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-page py-16">
        <Card className="bg-gradient-to-r from-primary-50 to-accent-50 p-8 text-center lg:p-12 dark:from-primary-950/30 dark:to-accent-950/30">
          <h2 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-ink-100">Ready to improve your community?</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-600 dark:text-ink-300">
            Join thousands of citizens making their neighbourhoods cleaner, safer, and better. It takes less than two minutes to file a report.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>Get started — it's free</Button>
            </Link>
            <Link to="/about">
              <Button variant="outline" size="lg">Learn more</Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
