import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Form';
import { useApp } from '@/context/AppContext';

import {
  updateComplaintDepartment,
  type ComplaintApiResponse,
} from '@/services/complaintService';

import {
  getDepartments,
  type DepartmentApiResponse,
} from '@/services/departmentService';

interface Props {
  complaint: ComplaintApiResponse;
  accessToken: string;
  onUpdated: () => void;
}

export function AdminComplaintDepartmentPanel({
  complaint,
  accessToken,
  onUpdated,
}: Props) {
  const { addToast } = useApp();

  const [departments, setDepartments] =
    useState<DepartmentApiResponse[]>([]);

  const [selectedId, setSelectedId] = useState(
    complaint.departmentId ?? ''
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Synchronise the selector after the parent reloads
  // the complaint or navigates to another complaint.
  useEffect(() => {
    setSelectedId(complaint.departmentId ?? '');
    setSaveError(null);
  }, [complaint.id, complaint.departmentId]);

  // Departments come from the authenticated Admin API.
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError(null);

    getDepartments(accessToken)
      .then((data) => {
        if (!cancelled) {
          setDepartments(data);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Could not load departments.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const closed = [
    'Resolved',
    'Rejected',
    'Withdrawn',
  ].includes(complaint.status);

  const activeDepartments = departments.filter(
    (department) => department.isActive
  );

  const options = activeDepartments.map((department) => ({
    value: department.id,
    label: department.name,
  }));

  const validSelection = activeDepartments.some(
    (department) => department.id === selectedId
  );

  const canSave =
    !loading &&
    !saving &&
    !closed &&
    validSelection &&
    selectedId !== (complaint.departmentId ?? '');

  async function handleSave() {
    if (!canSave) return;

    setSaving(true);
    setSaveError(null);

    try {
      await updateComplaintDepartment(
        complaint.id,
        selectedId,
        accessToken
      );

      addToast({
        type: 'success',
        title: 'Department assigned',
        message: 'Responsible department updated successfully.',
      });

      onUpdated();
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Unable to update the department.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold text-ink-900 dark:text-ink-100">
          Responsible Department
        </h3>
        <p className="mt-1 text-xs text-ink-500">
          View or update the department handling this complaint.
        </p>
      </CardHeader>

      <CardBody>
        <div className="mb-4">
          <p className="text-xs text-ink-500">
            Current department
          </p>
          <p className="mt-1 text-sm font-semibold text-ink-900 dark:text-ink-100">
            {complaint.departmentName ?? 'Unassigned'}
          </p>
        </div>

        {closed ? (
          <p className="text-sm text-ink-500">
            Department changes are unavailable for closed complaints.
          </p>
        ) : (
          <>
            <Select
              label="Assign to department"
              placeholder={
                loading
                  ? 'Loading departments...'
                  : 'Select an active department'
              }
              value={selectedId}
              options={options}
              disabled={loading || saving || !!loadError}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setSaveError(null);
              }}
            />

            {loading && (
              <p className="mt-2 text-xs text-ink-500">
                Loading active departments...
              </p>
            )}

            {!loading && options.length === 0 && !loadError && (
              <p className="mt-2 text-xs text-ink-500">
                No active departments are available.
              </p>
            )}

            {complaint.assignedToUserId && (
              <p className="mt-3 text-xs text-ink-500">
                This complaint has assigned staff. The selected
                department must match that staff member's department.
              </p>
            )}

            <div className="mt-4">
              <Button
                type="button"
                size="sm"
                disabled={!canSave}
                loading={saving}
                onClick={handleSave}
              >
                Save Department
              </Button>
            </div>
          </>
        )}

        {loadError && (
          <p role="alert" className="mt-3 text-sm text-error-600">
            {loadError}
          </p>
        )}

        {saveError && (
          <p role="alert" className="mt-3 text-sm text-error-600">
            {saveError}
          </p>
        )}

      </CardBody>
    </Card>
  );
}
