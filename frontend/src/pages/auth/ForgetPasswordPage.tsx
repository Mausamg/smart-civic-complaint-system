import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';

export function ForgotPasswordPage() {
  const { addToast } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      addToast({ type: 'success', title: 'Reset link sent', message: 'Check your email for instructions.' });
    }, 800);
  };

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your email and we will send you a reset link.">
      {sent ? (
        <div className="rounded-2xl border border-success-200 bg-success-50 p-6 text-center dark:border-success-900 dark:bg-success-950/30">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-100 text-success-600">
            <Mail className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-success-800 dark:text-success-300">Check your email</p>
          <p className="mt-1 text-sm text-success-700 dark:text-success-400">We sent a reset link to {email || 'your email'}. The link expires in 30 minutes.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/reset-password')}>I have my code — reset</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Email address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail className="h-4 w-4" />} placeholder="you@example.com" hint="We will send a reset link to this address" />
          <Button type="submit" fullWidth size="lg" loading={loading}>Send reset link</Button>
          <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-ink-500 hover:text-primary-600">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
