import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, UserCircle, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import type { UserRole } from '@/types';

export function LoginPage() {
  const { login, addToast } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('aarav.sharma@example.com');
  const [password, setPassword] = useState('demo1234');
  const [role, setRole] = useState<UserRole>('citizen');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      login(role);
      addToast({ type: 'success', title: 'Welcome back', message: `Signed in as ${role}.` });
      navigate(`/${role}/dashboard`);
    }, 800);
  };

  const roles: { value: UserRole; label: string; icon: typeof UserCircle; desc: string }[] = [
    { value: 'citizen', label: 'Citizen', icon: UserCircle, desc: 'Report and track issues' },
    { value: 'staff', label: 'Municipal Staff', icon: ShieldCheck, desc: 'Manage assigned complaints' },
    { value: 'admin', label: 'Administrator', icon: ShieldCheck, desc: 'Full system access' },
  ];

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your CivicLink account to continue.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <span className="label-base">Sign in as</span>
          <div className="grid grid-cols-3 gap-2">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition ${
                  role === r.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300'
                    : 'border-ink-200 text-ink-600 hover:border-ink-300 dark:border-ink-700'
                }`}
              >
                <r.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Input label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail className="h-4 w-4" />} placeholder="you@example.com" />
        <Input label="Password" isPassword required value={password} onChange={(e) => setPassword(e.target.value)} leftIcon={<Lock className="h-4 w-4" />} placeholder="••••••••" />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
            <input type="checkbox" className="h-4 w-4 rounded border-ink-300 text-primary-600 focus:ring-primary-500" defaultChecked />
            Remember me
          </label>
          <Link to="/forgot-password" className="font-medium text-primary-600 hover:underline">Forgot password?</Link>
        </div>

        <Button type="submit" fullWidth size="lg" loading={loading}>Sign in</Button>

        <p className="text-center text-sm text-ink-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-primary-600 hover:underline">Register here</Link>
        </p>
        <p className="rounded-lg bg-ink-50 px-3 py-2 text-center text-xs text-ink-400 dark:bg-ink-800/50">
          Demo: pick a role and click Sign in — no real credentials needed.
        </p>
      </form>
    </AuthLayout>
  );
}
