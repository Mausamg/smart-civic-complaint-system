import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Form';
import { useApp } from '@/context/AppContext';

import {
  updateComplaintPriority,
  type ComplaintApiResponse,
  type ComplaintPriorityValue,
} from '@/services/complaintService';

interface Props {
  complaint: ComplaintApiResponse;
  accessToken: string;
  onUpdated: () => void;
}

const priorityOptions: {
  value: ComplaintPriorityValue;
  label: string;
}[] = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

export function AdminComplaintPriorityPanel({
  complaint,
  accessToken,
  onUpdated,
}: Props) {
  const { addToast } = useApp();

  const [selectedPriority, setSelectedPriority] =
    useState<ComplaintPriorityValue | ''>('');

  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedStatus = complaint.status
    .replace(/[^a-z]/gi, '')
    .toLowerCase();

  const isClosed = [
    'resolved',
    'rejected',
    'withdrawn',
  ].includes(normalizedStatus);

  const currentPriority = complaint.priority
    .replace(/[^a-z]/gi, '')
    .toLowerCase();

  const isSamePriority =
    !!selectedPriority &&
    selectedPriority.toLowerCase() === currentPriority;

  const canUpdate =
    !isClosed &&
    !saving &&
    !!selectedPriority &&
    !isSamePriority;

  useEffect(() => {
    setSelectedPriority('');
    setConfirming(false);
    setError(null);
  }, [complaint.id, complaint.priority]);

  const handleUpdate = async () => {
    if (!canUpdate || !selectedPriority) return;

    setSaving(true);
    setError(null);

    try {
      await updateComplaintPriority(
        complaint.id,
        selectedPriority,
        accessToken
      );

      addToast({
        type: 'success',
        title: 'Priority updated',
        message: `Complaint priority changed to ${selectedPriority}.`,
      });

      setConfirming(false);
      setSelectedPriority('');

      onUpdated();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update complaint priority.'
      );

      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
        Complaint priority
      </h2>

      <p className="mt-1 text-xs text-ink-500">
        Review and update the priority assigned to this complaint.
      </p>

      <div className="mt-4 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
        <p className="text-xs text-ink-500">
          Current priority
        </p>

        <p className="mt-1 text-sm font-semibold">
          {complaint.priority}
        </p>
      </div>

      {isClosed ? (
        <p className="mt-4 text-sm text-ink-500">
          Priority cannot be changed for resolved, rejected,
          or withdrawn complaints.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <Select
            label="Select new priority"
            placeholder="Choose priority"
            value={selectedPriority}
            disabled={saving}
            options={priorityOptions}
            onChange={(event) => {
              setSelectedPriority(
                event.target.value as ComplaintPriorityValue | ''
              );

              setConfirming(false);
              setError(null);
            }}
          />

          {isSamePriority && (
            <p className="text-xs text-amber-600">
              This is already the current complaint priority.
            </p>
          )}

          {!confirming ? (
            <Button
              size="sm"
              disabled={!canUpdate}
              onClick={() => setConfirming(true)}
            >
              Review priority change
            </Button>
          ) : (
            <div className="space-y-3 rounded-xl border border-primary-200 p-3 dark:border-primary-900">
              <p className="text-sm text-ink-700 dark:text-ink-200">
                Change priority from{' '}
                <strong>{complaint.priority}</strong> to{' '}
                <strong>{selectedPriority}</strong>?
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  loading={saving}
                  disabled={!canUpdate}
                  onClick={() => void handleUpdate()}
                >
                  Confirm priority update
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

          {error && (
            <p role="alert" className="text-sm text-error-600">
              {error}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
