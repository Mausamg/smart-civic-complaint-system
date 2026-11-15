import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

import {
  updateStaffActiveStatus,
  type StaffApiResponse,
} from '@/services/staffService';

interface Props {
  staff: StaffApiResponse;
  accessToken: string;
  onUpdated: () => void;
}

export function AdminStaffStatusControl({
  staff,
  accessToken,
  onUpdated,
}: Props) {
  const { addToast } = useApp();

  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetActive = !staff.isActive;
  const action = targetActive ? 'Activate' : 'Deactivate';

  const staffName =
    `${staff.firstName} ${staff.lastName}`.trim() ||
    staff.email;

  const closeDialog = () => {
    if (saving) return;

    setConfirming(false);
    setError(null);
  };

  const handleConfirm = async () => {
    if (saving) return;

    setSaving(true);
    setError(null);

    try {
      await updateStaffActiveStatus(
        staff.id,
        targetActive,
        accessToken
      );

      addToast({
        type: 'success',
        title: `Staff ${targetActive ? 'activated' : 'deactivated'}`,
        message: `${staffName} is now ${
          targetActive ? 'active' : 'inactive'
        }.`,
      });

      setConfirming(false);
      onUpdated();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update staff account status.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={staff.isActive ? 'outline' : 'primary'}
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
      >
        {action}
      </Button>

      <Modal
        open={confirming}
        onClose={closeDialog}
        title={`${action} staff account?`}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={closeDialog}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant={targetActive ? 'primary' : 'danger'}
              loading={saving}
              onClick={() => void handleConfirm()}
            >
              {action} account
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-700 dark:text-ink-200">
            {action} the account for{' '}
            <strong>{staffName}</strong> ({staff.email})?
          </p>

          {!targetActive && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Existing complaint assignments will not be
              automatically reassigned. Review this staff
              member's assigned complaints before deactivation.
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-error-600">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
