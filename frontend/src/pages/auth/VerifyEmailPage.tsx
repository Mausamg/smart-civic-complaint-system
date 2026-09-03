import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import { cn } from '@/utils/format';

export function VerifyEmailPage() {
  const { addToast } = useApp();
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  const setDigit = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...code];
    next[i] = v;
    setCode(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.some((c) => !c)) return addToast({ type: 'error', title: 'Incomplete code', message: 'Enter all 6 digits.' });
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addToast({ type: 'success', title: 'Email verified', message: 'Your account is now active.' });
      navigate('/login');
    }, 900);
  };

  return (
    <AuthLayout title="Verify your email" subtitle="We sent a 6-digit verification code to your email address.">
      <div className="mb-6 flex items-center gap-3 rounded-xl bg-primary-50 p-4 dark:bg-primary-950/30">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900">
          <Mail className="h-5 w-5" />
        </div>
        <p className="text-sm text-primary-800 dark:text-primary-300">Enter the code below to activate your account.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <span className="label-base">Verification code</span>
          <div className="flex justify-between gap-2">
            {code.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => handleKey(i, e)}
                inputMode="numeric"
                maxLength={1}
                className={cn(
                  'h-14 w-12 rounded-xl border-2 bg-white text-center text-xl font-bold text-ink-900 transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:bg-ink-900 dark:text-ink-100',
                  d ? 'border-primary-500' : 'border-ink-200 dark:border-ink-700'
                )}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>
        </div>
        <Button type="submit" fullWidth size="lg" loading={loading} leftIcon={<ShieldCheck className="h-4 w-4" />}>Verify email</Button>
        <div className="flex items-center justify-between text-sm">
          <button type="button" className="text-primary-600 hover:underline" onClick={() => addToast({ type: 'info', title: 'Code resent' })}>Resend code</button>
          <Link to="/login" className="flex items-center gap-1.5 text-ink-500 hover:text-primary-600">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
