import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { createStaffAccount } from '@/services/staffService';

interface Props {
  accessToken: string;
  onCreated: () => void;
}

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export function AdminStaffCreateControl({
  accessToken,
  onCreated,
}: Props) {
  const { addToast } = useApp();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (name: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setError(null);
  };

  const close = () => {
    if (saving) return;
    setOpen(false);
    setForm(initialForm);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (saving) return;

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();

    if (!firstName || !lastName || !email || !form.password) {
      setError('Please complete every required field.');
      return;
    }

    if (firstName.length > 50 || lastName.length > 50) {
      setError('First and last names must be 50 characters or fewer.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (email.length > 256) {
      setError('Email must be 256 characters or fewer.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createStaffAccount(
        {
          firstName,
          lastName,
          email,
          password: form.password,
        },
        accessToken
      );

      addToast({
        type: 'success',
        title: 'Staff account created',
        message: `${firstName} ${lastName} can now be managed in Staff Management.`,
      });

      setOpen(false);
      setForm(initialForm);
      onCreated();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create the staff account.'
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 ' +
    'text-sm text-ink-900 outline-none focus:border-primary-500 ' +
    'dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100';

  const labelClass =
    'mb-1 block text-sm font-medium text-ink-700 dark:text-ink-200';

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Add Staff
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Create Staff Account"
        description="Register a new staff member in CivicLink."
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={close}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="admin-create-staff-form"
              loading={saving}
            >
              Create Staff
            </Button>
          </>
        }
      >
        <form
          id="admin-create-staff-form"
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="staff-first-name" className={labelClass}>
                First name
              </label>
              <input
                id="staff-first-name"
                className={inputClass}
                value={form.firstName}
                maxLength={50}
                required
                autoComplete="given-name"
                onChange={(e) =>
                  update('firstName', e.target.value)
                }
              />
            </div>

            <div>
              <label htmlFor="staff-last-name" className={labelClass}>
                Last name
              </label>
              <input
                id="staff-last-name"
                className={inputClass}
                value={form.lastName}
                maxLength={50}
                required
                autoComplete="family-name"
                onChange={(e) =>
                  update('lastName', e.target.value)
                }
              />
            </div>
          </div>

          <div>
            <label htmlFor="staff-email" className={labelClass}>
              Email address
            </label>
            <input
              id="staff-email"
              className={inputClass}
              type="email"
              value={form.email}
              maxLength={256}
              required
              autoComplete="off"
              onChange={(e) =>
                update('email', e.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="staff-password" className={labelClass}>
              Password
            </label>
            <input
              id="staff-password"
              className={inputClass}
              type="password"
              value={form.password}
              minLength={8}
              required
              autoComplete="new-password"
              onChange={(e) =>
                update('password', e.target.value)
              }
            />
            <p className="mt-1 text-xs text-ink-500">
              Minimum 8 characters. Additional server password
              requirements may apply.
            </p>
          </div>

          <div>
            <label htmlFor="staff-confirm-password" className={labelClass}>
              Confirm password
            </label>
            <input
              id="staff-confirm-password"
              className={inputClass}
              type="password"
              value={form.confirmPassword}
              required
              autoComplete="new-password"
              onChange={(e) =>
                update('confirmPassword', e.target.value)
              }
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-error-600">
              {error}
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}
