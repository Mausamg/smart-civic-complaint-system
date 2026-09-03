import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Users, BarChart3, MapPin } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

const features = [
  { icon: CheckCircle2, title: 'Track every complaint', desc: 'Real-time status from submission to resolution' },
  { icon: Users, title: 'Community-driven', desc: 'Join 18,000+ citizens improving their wards' },
  { icon: BarChart3, title: 'Transparent analytics', desc: 'See department performance and resolution times' },
  { icon: MapPin, title: 'Public map', desc: 'View reported issues across your municipality' },
];

export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-accent-800 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
          <div className="absolute -right-20 top-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-accent-300/30 blur-3xl" />
        </div>
        <Link to="/" className="relative">
          <span className="flex items-center gap-2 text-lg font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <ShieldCheck className="h-5 w-5" />
            </span>
            CivicLink
          </span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight">Report civic issues. Track progress. Improve your community.</h2>
          <p className="mt-3 max-w-md text-white/80">Join thousands of citizens making their neighbourhoods cleaner, safer, and better managed.</p>
          <div className="mt-8 grid gap-3">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-white/70">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} CivicLink. All rights reserved.</p>
      </div>

      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Link to="/"><Logo /></Link>
          <Link to="/" className="text-sm text-ink-500 hover:text-primary-600">← Back home</Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 dark:text-ink-100">{title}</h1>
            <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
