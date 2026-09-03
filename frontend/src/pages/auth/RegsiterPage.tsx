import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, MapPin, Home, Building2, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input, Select, Checkbox } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';

export function RegisterPage() {
  const { addToast } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirm: '', address: '', municipality: 'Kathmandu Metropolitan City', ward: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!/^[+\d][\d\s-]{6,}$/.test(form.phone)) e.phone = 'Enter a valid phone number';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
    if (!form.address.trim()) e.address = 'Address is required';
    if (!form.ward) e.ward = 'Select your ward';
    if (!agree) e.agree = 'You must accept the terms to continue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      addToast({ type: 'success', title: 'Account created', message: 'Please verify your email to activate your account.' });
      navigate('/verify-email');
    }, 1000);
  };

  return (
    <AuthLayout title="Create your account" subtitle="Join CivicLink to report and track civic issues in your community.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full name" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} leftIcon={<User className="h-4 w-4" />} error={errors.fullName} placeholder="Aarav Sharma" />
        <Input label="Email address" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} leftIcon={<Mail className="h-4 w-4" />} error={errors.email} placeholder="you@example.com" />
        <Input label="Phone number" required value={form.phone} onChange={(e) => set('phone', e.target.value)} leftIcon={<Phone className="h-4 w-4" />} error={errors.phone} placeholder="+977 98XXXXXXXX" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Password" isPassword required value={form.password} onChange={(e) => set('password', e.target.value)} leftIcon={<Lock className="h-4 w-4" />} error={errors.password} placeholder="At least 8 characters" hint="Use 8+ chars with letters and numbers" />
          <Input label="Confirm password" isPassword required value={form.confirm} onChange={(e) => set('confirm', e.target.value)} leftIcon={<Lock className="h-4 w-4" />} error={errors.confirm} placeholder="Re-enter password" />
        </div>
        <Input label="Address" required value={form.address} onChange={(e) => set('address', e.target.value)} leftIcon={<Home className="h-4 w-4" />} error={errors.address} placeholder="Street address" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Municipality" value={form.municipality} onChange={(e) => set('municipality', e.target.value)} options={[
            { value: 'Kathmandu Metropolitan City', label: 'Kathmandu Metropolitan City' },
            { value: 'Lalitpur Metropolitan City', label: 'Lalitpur Metropolitan City' },
            { value: 'Bhaktapur Municipality', label: 'Bhaktapur Municipality' },
          ]} />
          <Select label="Ward number" placeholder="Select ward" value={form.ward} onChange={(e) => set('ward', e.target.value)} options={Array.from({ length: 32 }, (_, i) => ({ value: `Ward ${i + 1}`, label: `Ward ${i + 1}` }))} error={errors.ward} />
        </div>

        <div>
          <span className="label-base">Profile photo (optional)</span>
          <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-ink-300 px-4 py-4 text-sm text-ink-500 hover:border-primary-400 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800/50">
            <input type="file" accept="image/*" className="hidden" />
            <Building2 className="mr-2 h-4 w-4" /> Click to upload a photo
          </label>
        </div>

        <Checkbox
          label={<>I agree to the <Link to="/about" className="text-primary-600 hover:underline">Terms of Service</Link> and <Link to="/about" className="text-primary-600 hover:underline">Privacy Policy</Link></>}
          checked={agree}
          onChange={setAgree}
          error={errors.agree}
        />

        <Button type="submit" fullWidth size="lg" loading={loading} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Create account</Button>

        <p className="text-center text-sm text-ink-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
