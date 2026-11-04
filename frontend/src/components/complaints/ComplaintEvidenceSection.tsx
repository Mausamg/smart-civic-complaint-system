import { useEffect, useState } from 'react';

import { EvidenceGallery } from '@/components/complaints/EvidenceGallery';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import {
  downloadComplaintAttachment,
  getComplaintAttachments,
} from '@/services/attachmentService';

import type { Evidence } from '@/types';

interface ComplaintEvidenceSectionProps {
  complaintId: string;
  accessToken: string;
}

export function ComplaintEvidenceSection({
  complaintId,
  accessToken,
}: ComplaintEvidenceSectionProps) {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const objectUrls: string[] = [];

    setLoading(true);
    setEvidence([]);
    setError(null);

    const loadEvidence = async () => {
      try {
        const attachments = await getComplaintAttachments(
          complaintId,
          accessToken,
          controller.signal
        );

        const loaded: Evidence[] = [];
        let failed = 0;

        for (const attachment of attachments) {
          if (controller.signal.aborted) return;

          try {
            const blob = await downloadComplaintAttachment(
              complaintId,
              attachment.id,
              accessToken,
              controller.signal
            );

            if (controller.signal.aborted) return;

            if (!blob.type.startsWith('image/')) {
              failed += 1;
              continue;
            }

            const url = URL.createObjectURL(blob);
            objectUrls.push(url);

            loaded.push({
              id: attachment.id,
              type: 'image',
              url,
              caption: attachment.fileName,
              uploadedAt: attachment.createdAtUtc,
            });
          } catch {
            if (controller.signal.aborted) return;
            failed += 1;
          }
        }

        if (!controller.signal.aborted) {
          setEvidence(loaded);

          if (failed > 0) {
            setError(
              `${failed} of ${attachments.length} evidence images could not be loaded.`
            );
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load complaint evidence.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadEvidence();

    return () => {
      controller.abort();

      objectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [complaintId, accessToken, retryCount]);

  return (
    <Card className="mt-4 p-6">
      <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-100">
        Photo evidence
      </h2>

      {loading && (
        <p role="status" className="text-sm text-ink-500">
          Loading complaint evidence...
        </p>
      )}

      {error && !loading && (
        <div role="alert" className="mb-4 space-y-3">
          <p className="text-sm text-error-600">{error}</p>

          <Button
            variant="ghost"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Retry loading evidence
          </Button>
        </div>
      )}

      {!loading && (!error || evidence.length > 0) && (
        <EvidenceGallery
          evidence={evidence}
          title="Complaint photo evidence"
        />
      )}
    </Card>
  );
}
