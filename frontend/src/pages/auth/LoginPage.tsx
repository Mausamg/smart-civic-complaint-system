
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { useApp } from '@/context/AppContext';
import { loginUser } from '@/services/authService';

export function LoginPage() {
  const { login, addToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const response = await loginUser(email, password);

      // Actual role comes from the backend response.
      const authenticatedRole = login(response);

      addToast({
        type: 'success',
        title: 'Welcome back',
        message: `Signed in successfully as ${authenticatedRole}.`,
      });

      const requestedPath = (
        location.state as { from?: { pathname?: string } } | null
      )?.from?.pathname;

      const destination =
        requestedPath?.startsWith(`/${authenticatedRole}/`)
          ? requestedPath
          : `/${authenticatedRole}/dashboard`;

      navigate(destination, { replace: true });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Sign in failed',
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your CivicLink account to continue."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="h-4 w-4" />}
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          isPassword
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          placeholder="Enter your password"
        />

        <div className="flex justify-end text-sm">
          <Link
            to="/forgot-password"
            className="font-medium text-primary-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading}
        >
          Sign in
        </Button>

        <p className="text-center text-sm text-ink-500">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-primary-600 hover:underline"
          >
            Register here
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

