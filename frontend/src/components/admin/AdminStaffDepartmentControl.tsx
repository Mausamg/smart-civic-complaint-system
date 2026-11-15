import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

import type {
  DepartmentApiResponse,
} from '@/services/departmentService';

import {
  updateStaffDepartment,
  type StaffApiResponse,
} from '@/services/staffService';

interface Props {
  staff: StaffApiResponse;
  departments: DepartmentApiResponse[];
  departmentsLoading: boolean;
  departmentsError: string | null;
  accessToken: string;
  onUpdated: () => void;
}

export function AdminStaffDepartmentControl({
  staff,
  departments,
  departmentsLoading,
  departmentsError,
  accessToken,
  onUpdated,
}: Props) {
  const { addToast } = useApp();

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(
    staff.departmentId ?? ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name =
    `${staff.firstName} ${staff.lastName}`.trim() ||
    staff.email;

  const currentId = staff.departmentId ?? '';

  const options = [
    { value: '', label: 'Unassigned (no department)' },
    ...departments
      .filter(
        (department) =>
          department.isActive ||
          department.id === staff.departmentId
      )
      .map((department) => ({
        value: department.id,
        label: department.isActive
          ? department.name
          : `${department.name} (inactive)`,
      })),
  ];

  const selectedDepartment = departments.find(
    (department) => department.id === selectedId
  );

  const valid =
    selectedId === '' ||
    !!selectedDepartment?.isActive;

  const canSave =
    selectedId !== currentId &&
    valid &&
    !saving &&
    !departmentsLoading &&
    !departmentsError;

  const close = () => {
    if (saving) return;
    setOpen(false);
    setError(null);
  };

  const save = async () => {
    if (!canSave) return;

    setSaving(true);
    setError(null);

    try {
      await updateStaffDepartment(
        staff.id,
        selectedId || null,
        accessToken
      );

      addToast({
        type: 'success',
        title: 'Staff department updated',
        message: selectedDepartment
          ? `${name} is now assigned to ${selectedDepartment.name}.`
          : `${name} now has no assigned department.`,
      });

      setOpen(false);
      onUpdated();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update staff department.'
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
        variant="outline"
        disabled={departmentsLoading || !!departmentsError}
        onClick={() => {
          setSelectedId(currentId);
          setError(null);
          setOpen(true);
        }}
      >
        Change Department
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="Change Department"
        description={`Update department membership for ${name}.`}
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
              type="button"
              loading={saving}
              disabled={!canSave}
              onClick={() => void save()}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="rounded-xl bg-ink-50 p-4 dark:bg-ink-800/50">
            <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">
              {name}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              {staff.email}
            </p>
          </div>

          <div className="space-y-2">
            <Select
              id={`staff-department-${staff.id}`}
              label="Responsible department"
              value={selectedId}
              options={options}
              disabled={saving}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setError(null);
              }}
            />

            <p className="text-xs leading-5 text-ink-500">
              Only active departments can be assigned.
              Staff with unresolved complaints may need their
              complaints reassigned before moving departments.
            </p>
          </div>

          {!valid && (
            <p role="alert" className="text-sm text-error-600">
              Select an active department.
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:bg-error-950/20">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
