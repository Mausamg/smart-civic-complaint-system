
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { useApp } from '@/context/AppContext';
import { registerUser } from '@/services/authService';
import { CheckCircle2, Lock, Mail, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function RegisterPage() {
  const { addToast } = useApp();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirm: '',
  });

  const set = (key: keyof typeof form, value: string) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [key]: '',
      form: '',
    }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.firstName.trim())
      nextErrors.firstName = 'First name is required';

    if (!form.lastName.trim())
      nextErrors.lastName = 'Last name is required';

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email))
      nextErrors.email = 'Enter a valid email address';

    if (form.password.length < 8)
      nextErrors.password = 'Password must be at least 8 characters';

    if (form.confirm !== form.password)
      nextErrors.confirm = 'Passwords do not match';

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading || !validate()) return;

    setLoading(true);

    try {
      await registerUser({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });

      addToast({
        type: 'success',
        title: 'Account created successfully',
        message: 'You can now sign in to your CivicLink account.',
      });

      navigate('/login', { replace: true });
    } catch (error) {
      const message =
          error instanceof Error
              ? error.message
              : 'Something went wrong. Please try again.';

      setErrors({ form: message });

      addToast({
        type: 'error',
        title: 'Registration failed',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
      <AuthLayout
          title="Create your account"
          subtitle="Join CivicLink to report and track civic issues in your community."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
                label="First name"
                required
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                leftIcon={<User className="h-4 w-4" />}
                error={errors.firstName}
                placeholder="First name"
            />

            <Input
                label="Last name"
                required
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                leftIcon={<User className="h-4 w-4" />}
                error={errors.lastName}
                placeholder="Last name"
            />
          </div>

          <Input
              label="Email address"
              type="email"
              required
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email}
              placeholder="you@example.com"
          />

          <Input
              label="Password"
              isPassword
              required
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.password}
              placeholder="Create a strong password"
              hint="At least 8 characters. Additional password rules may apply."
          />

          <Input
              label="Confirm password"
              isPassword
              required
              value={form.confirm}
              onChange={(e) => set('confirm', e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
              error={errors.confirm}
              placeholder="Re-enter your password"
          />

          {errors.form && (
              <p role="alert" className="text-sm text-error-600">
                {errors.form}
              </p>
          )}

          <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
          >
            Create account
          </Button>

          <p className="text-center text-sm text-ink-500">
            Already have an account?{' '}
            <Link
                to="/login"
                className="font-semibold text-primary-600 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </AuthLayout>
  );
}
