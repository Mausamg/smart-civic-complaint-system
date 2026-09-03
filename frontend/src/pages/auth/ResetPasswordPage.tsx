import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';

export function ResetPasswordPage() {
  const { addToast } = useApp();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code.trim()) return setError('Enter the verification code from your email');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addToast({ type: 'success', title: 'Password reset', message: 'You can now sign in with your new password.' });
      navigate('/login');
    }, 800);
  };

  return (
    <AuthLayout title="Reset password" subtitle="Enter the code from your email and choose a new password.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input label="Verification code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" error={error && !code ? error : ''} />
        <div>
          <Input label="New password" isPassword required value={password} onChange={(e) => setPassword(e.target.value)} leftIcon={<Lock className="h-4 w-4" />} placeholder="At least 8 characters" />
          {password && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className={`flex items-center gap-1 ${strength ? 'text-success-600' : 'text-ink-400'}`}>
                <CheckCircle2 className="h-3.5 w-3.5" /> {strength ? 'Strong password' : 'Add uppercase and a number'}
              </span>
            </div>
          )}
        </div>
        <Input label="Confirm new password" isPassword required value={confirm} onChange={(e) => setConfirm(e.target.value)} leftIcon={<Lock className="h-4 w-4" />} placeholder="Re-enter password" error={error && password !== confirm ? error : ''} />
        {error && (code && (password.length < 8 || password !== confirm)) && (
          <p className="text-xs text-error-600">{error}</p>
        )}
        <Button type="submit" fullWidth size="lg" loading={loading}>Reset password</Button>
        <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-ink-500 hover:text-primary-600">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </form>
    </AuthLayout>
  );
}
