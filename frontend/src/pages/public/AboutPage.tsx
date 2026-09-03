import { Target, Eye, Heart, ShieldCheck, BarChart3, Users, FileText, CheckCircle2, Lock } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';

const values = [
  { icon: 'Target', title: 'Our Mission', desc: 'To empower citizens with a transparent, accessible platform to report civic issues and hold municipal services accountable.' },
  { icon: 'Eye', title: 'Our Vision', desc: 'A community where every citizen can easily contribute to a cleaner, safer, and better-managed neighbourhood.' },
  { icon: 'Heart', title: 'Our Values', desc: 'Transparency, accountability, accessibility, and citizen-first service delivery in every interaction.' },
];

const benefits = [
  { icon: 'Users', title: 'For Citizens', points: ['Report issues in minutes with photos and location', 'Track real-time progress of every complaint', 'Communicate directly with assigned departments', 'Rate service and reopen unresolved complaints'] },
  { icon: 'BarChart3', title: 'For Authorities', points: ['Centralised dashboard of all incoming complaints', 'Automatic department routing and assignment', 'Analytics on resolution times and satisfaction', 'Reduced duplicate reports and faster response'] },
];

const process = [
  { icon: 'FileText', title: '1. Citizen reports', desc: 'Submit a complaint with category, description, location, and evidence.' },
  { icon: 'Eye', title: '2. Municipal review', desc: 'Staff verify the complaint and route it to the appropriate department.' },
  { icon: 'CheckCircle2', title: '3. Department action', desc: 'The assigned team works on the issue and posts progress updates.' },
  { icon: 'ShieldCheck', title: '4. Citizen confirms', desc: 'The citizen confirms resolution, rates the service, and the complaint is closed.' },
];

export function AboutPage() {
  return (
    <div className="container-page py-10">
      <PageHeader
        title="About CivicLink"
        subtitle="A modern civic complaint platform connecting citizens and municipal authorities."
        breadcrumbs={[{ label: 'About' }]}
      />

      <Card className="mb-10 overflow-hidden p-0">
        <div className="grid bg-gradient-to-br from-primary-600 to-accent-700 p-8 text-white lg:grid-cols-2 lg:p-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Building better communities, together</h2>
            <p className="mt-4 max-w-xl text-white/85">
              CivicLink is a Smart Civic Complaint System designed to bridge the gap between citizens and municipal services. We believe that when citizens can easily report problems and track their resolution, communities become cleaner, safer, and more responsive.
            </p>
            <p className="mt-4 max-w-xl text-white/85">
              From potholes to broken streetlights, from garbage collection to water leaks — every report matters and contributes to a better quality of life for everyone.
            </p>
          </div>
          <div className="hidden items-center justify-center lg:flex">
            <div className="grid grid-cols-2 gap-4">
              {['4,800+', '3,100+', '32', '4.3★'].map((v, i) => (
                <div key={i} className="rounded-2xl bg-white/10 p-5 text-center backdrop-blur">
                  <p className="text-2xl font-bold">{v}</p>
                  <p className="mt-1 text-xs text-white/70">{['Complaints', 'Resolved', 'Wards', 'Rating'][i]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-10 grid gap-5 md:grid-cols-3">
        {values.map((v) => (
          <Card key={v.title} className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/40">
              <Icon name={v.icon} className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-100">{v.title}</h3>
            <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{v.desc}</p>
          </Card>
        ))}
      </div>

      <div className="mb-10 grid gap-5 md:grid-cols-2">
        {benefits.map((b) => (
          <Card key={b.title} className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 dark:bg-accent-950/40">
              <Icon name={b.icon} className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-100">{b.title}</h3>
            <ul className="mt-3 space-y-2">
              {b.points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" />
                  {p}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <h2 className="mb-5 text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-100">How complaints are handled</h2>
      <div className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {process.map((p) => (
          <Card key={p.title} className="p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white">
              <Icon name={p.icon} className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">{p.title}</h3>
            <p className="mt-1.5 text-xs text-ink-500">{p.desc}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-600 dark:bg-success-950/40">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink-900 dark:text-ink-100">Transparency & Privacy</h3>
            <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
              We are committed to transparency in how complaints are handled while protecting citizen privacy. Personal details such as phone numbers, email addresses, and exact home addresses are never displayed publicly. Citizens can also choose to submit complaints anonymously. Complaint records are retained for municipal accountability, but personal data can be deleted on request. All data is encrypted and access is role-based.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
