import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select, Textarea } from '@/components/ui/Form';
import { useApp } from '@/context/AppContext';
import {
  updateComplaintStatus,
  type ComplaintApiResponse,
  type StaffStatusUpdate,
} from '@/services/complaintService';

interface Props {
  complaint: ComplaintApiResponse;
  accessToken: string;
  onUpdated: () => void;
}

const transitions: Record<string, StaffStatusUpdate[]> = {
  Submitted: ['UnderReview', 'Rejected'],
  UnderReview: ['InProgress', 'Resolved', 'Rejected'],
  InProgress: ['Resolved', 'Rejected'],
};

const labels: Record<StaffStatusUpdate, string> = {
  UnderReview: 'Under Review',
  InProgress: 'In Progress',
  Resolved: 'Resolved',
  Rejected: 'Rejected',
};

export function StaffStatusUpdatePanel({
  complaint,
  accessToken,
  onUpdated,
}: Props) {
  const { addToast } = useApp();

  const [nextStatus, setNextStatus] =
    useState<StaffStatusUpdate | ''>('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = transitions[complaint.status] ?? [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      saving ||
      !nextStatus ||
      !allowed.includes(nextStatus)
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await updateComplaintStatus(
        complaint.id,
        nextStatus,
        accessToken,
        note
      );

      addToast({
        type: 'success',
        title: 'Complaint status updated',
        message: `New status: ${result.status}`,
      });

      onUpdated();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update complaint status.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-4 p-5">
      <h2 className="text-lg font-semibold">
        Manage complaint status
      </h2>

      <p className="mt-2 text-sm text-ink-500">
        Current status: {complaint.status}
      </p>

      {allowed.length === 0 ? (
        <p className="mt-4 text-sm text-ink-500">
          No further status transitions are available.
        </p>
      ) : (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-4 space-y-4"
        >
          <Select
            id="staff-next-status"
            label="Change status to"
            value={nextStatus}
            placeholder="Select next status"
            disabled={saving}
            onChange={(event) => {
              setNextStatus(
                event.target.value as StaffStatusUpdate | ''
              );
              setError(null);
            }}
            options={allowed.map((value) => ({
              value,
              label: labels[value],
            }))}
          />

          <Textarea
            id="staff-status-note"
            label="Explanation note (optional)"
            value={note}
            maxLength={500}
            disabled={saving}
            placeholder="Explain the progress or reason for this status change..."
            onChange={(event) => setNote(event.target.value)}
          />

          <p className="text-xs text-amber-700 dark:text-amber-300">
            This note will be visible to the citizen.
            Do not include private staff information.
          </p>

          <p className="text-xs text-ink-500">
            {note.length}/500 characters
          </p>

          {error && (
            <p role="alert" className="text-sm text-error-600">
              {error}
            </p>
          )}

          <Button
            type="submit"
            loading={saving}
            disabled={!nextStatus || saving}
          >
            Save status change
          </Button>
        </form>
      )}
    </Card>
  );
}
