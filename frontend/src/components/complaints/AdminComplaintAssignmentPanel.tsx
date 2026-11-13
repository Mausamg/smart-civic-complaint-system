import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Form';
import { useApp } from '@/context/AppContext';

import {
  assignComplaint,
  type ComplaintApiResponse,
} from '@/services/complaintService';

import {
  getActiveStaff,
  type StaffApiResponse,
} from '@/services/staffService';

interface Props {
  complaint: ComplaintApiResponse;
  accessToken: string;
  onAssigned: () => void;
}

function staffName(staff: StaffApiResponse): string {
  return `${staff.firstName} ${staff.lastName}`.trim() || staff.email;
}

export function AdminComplaintAssignmentPanel({
  complaint,
  accessToken,
  onAssigned,
}: Props) {
  const { addToast } = useApp();

  const [staff, setStaff] = useState<StaffApiResponse[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const normalizedStatus = complaint.status
    .replace(/[^a-z]/gi, '')
    .toLowerCase();

  const canAssign = [
    'submitted',
    'underreview',
    'inprogress',
  ].includes(normalizedStatus);

  useEffect(() => {
    let cancelled = false;

    setStaff([]);
    setSelectedId('');
    setConfirming(false);
    setLoadError(null);
    setActionError(null);
    setLoading(canAssign);

    if (!canAssign) {
      return () => {
        cancelled = true;
      };
    }

    getActiveStaff(accessToken)
      .then((data) => {
        if (!cancelled) {
          setStaff(data.filter(
            (person) =>
              person.isActive &&
              (
                !complaint.departmentId ||
                person.departmentId?.toLowerCase() ===
                  complaint.departmentId.toLowerCase()
              )
          ));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Unable to load active staff.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    complaint.id,
    complaint.assignedToUserId,
    complaint.departmentId,
    accessToken,
    canAssign,
    retryCount,
  ]);

  const selectedStaff = staff.find(
    (person) => person.id === selectedId
  );

  const alreadyAssigned =
    !!selectedId && selectedId === complaint.assignedToUserId;

  const canSubmit =
    canAssign &&
    !loading &&
    !loadError &&
    !saving &&
    !!selectedStaff &&
    !alreadyAssigned;

  const currentName = complaint.assignedTo
    ? `${complaint.assignedTo.firstName} ${complaint.assignedTo.lastName}`.trim()
    : complaint.assignedToUserId
      ? 'Assigned staff member'
      : 'Unassigned';

  const submitAssignment = async () => {
    if (!canSubmit || !selectedStaff) return;

    setSaving(true);
    setActionError(null);

    try {
      await assignComplaint(
        complaint.id,
        selectedStaff.id,
        accessToken
      );

      setConfirming(false);
      setSelectedId('');

      addToast({
        type: 'success',
        title: 'Complaint assigned',
        message: `Assigned to ${staffName(selectedStaff)}.`,
      });

      onAssigned();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Unable to assign this complaint.'
      );
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
        Complaint assignment
      </h2>

      <p className="mt-1 text-xs text-ink-500">
        {complaint.departmentId
          ? 'Assign or reassign to active staff in the responsible department.'
          : 'Assign or reassign this complaint to an active staff member.'}
      </p>

      <div className="mt-4 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
        <p className="text-xs text-ink-500">Current assignee</p>
        <p className="mt-1 text-sm font-semibold">
          {currentName || 'Assigned staff member'}
        </p>
      </div>

      {!canAssign && (
        <p className="mt-4 text-sm text-ink-500">
          Resolved, rejected and withdrawn complaints cannot be assigned.
        </p>
      )}

      {canAssign && (
        <div className="mt-4 space-y-3">
          {loading && (
            <p role="status" className="text-sm text-ink-500">
              Loading active staff...
            </p>
          )}

          {loadError && (
            <div role="alert" className="space-y-2">
              <p className="text-sm text-error-600">{loadError}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRetryCount((n) => n + 1)}
              >
                Retry
              </Button>
            </div>
          )}

          {!loading && !loadError && staff.length === 0 && (
            <p className="text-sm text-ink-500">
              {complaint.departmentId
                ? 'No active staff belong to this complaint’s department. Assign staff through Staff Management first.'
                : 'No active staff members are available.'}
            </p>
          )}

          {!loading && !loadError && staff.length > 0 && (
            <>
              <Select
                label="Select active staff"
                placeholder="Choose a staff member"
                value={selectedId}
                disabled={saving}
                options={staff.map((person) => ({
                  value: person.id,
                  label: `${staffName(person)} (${person.email})`,
                }))}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setConfirming(false);
                  setActionError(null);
                }}
              />

              {alreadyAssigned && (
                <p className="text-xs text-amber-600">
                  This complaint is already assigned to that staff member.
                </p>
              )}

              {!confirming ? (
                <Button
                  size="sm"
                  disabled={!canSubmit}
                  onClick={() => setConfirming(true)}
                >
                  Review assignment
                </Button>
              ) : (
                <div className="space-y-3 rounded-xl border border-primary-200 p-3 dark:border-primary-900">
                  <p className="text-sm text-ink-700 dark:text-ink-200">
                    Confirm assignment to{' '}
                    <strong>{selectedStaff && staffName(selectedStaff)}</strong>?
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      loading={saving}
                      disabled={!canSubmit}
                      onClick={submitAssignment}
                    >
                      Confirm assignment
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() => setConfirming(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {actionError && (
            <p role="alert" className="text-sm text-error-600">
              {actionError}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
