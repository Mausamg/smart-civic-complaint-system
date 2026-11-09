import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Card } from '@/components/ui/Card';
import { ApiError } from '@/services/apiClient';
import {
  addComplaintComment,
  getComplaintComments,
  type ComplaintCommentApiResponse,
} from '@/services/complaintCommentService';

interface ComplaintConversationPanelProps {
  complaintId: string;
  complaintStatus: string;
  accessToken: string;
  currentUserId?: string;
}

const CLOSED_STATUSES = [
  'Resolved',
  'Rejected',
  'Withdrawn',
];

export function ComplaintConversationPanel({
  complaintId,
  complaintStatus,
  accessToken,
  currentUserId,
}: ComplaintConversationPanelProps) {
  const [messages, setMessages] =
    useState<ComplaintCommentApiResponse[]>([]);

  const lastConversationKey = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendBlocked, setSendBlocked] = useState(false);

  const isClosed = CLOSED_STATUSES.includes(complaintStatus);
  const canSend = !isClosed && !sendBlocked && !error && !loading;

  useEffect(() => {
    setDraft('');
    setSendError(null);
    setSendBlocked(false);
  }, [complaintId, accessToken]);

  useEffect(() => {
    let cancelled = false;

    const conversationKey = `${complaintId}:${accessToken}`;
    const changed = lastConversationKey.current !== conversationKey;

    lastConversationKey.current = conversationKey;

    // Preserve existing messages during automatic refresh.
    if (changed) {
      setLoading(true);
      setMessages([]);
    }

    setError(null);

    getComplaintComments(complaintId, accessToken)
      .then((data) => {
        if (!cancelled) setMessages(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        if (err instanceof ApiError && err.status === 403) {
          setError('You do not have access to this conversation.');
        } else if (err instanceof ApiError && err.status === 404) {
          setError('This complaint is no longer available.');
        } else {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load conversation.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [complaintId, accessToken, reloadCount]);

  // Refresh the conversation every 15 seconds while visible.
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        setReloadCount((count) => count + 1);
      }
    };

    const pollId = window.setInterval(
      refreshIfVisible,
      15000
    );

    // Refresh immediately when returning to this tab.
    document.addEventListener(
      'visibilitychange',
      refreshIfVisible
    );

    return () => {
      window.clearInterval(pollId);

      document.removeEventListener(
        'visibilitychange',
        refreshIfVisible
      );
    };
  }, [complaintId, accessToken]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = draft.trim();

    if (
      !canSend ||
      sending ||
      !message ||
      message.length > 1000
    ) {
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      await addComplaintComment(
        complaintId,
        message,
        accessToken
      );

      setDraft('');
      setReloadCount((count) => count + 1);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403) {
        setSendError(
          'You no longer have permission to reply to this complaint.'
        );
        setSendBlocked(true);
      } else if (err instanceof ApiError && err.status === 400) {
        setSendError(
          'Your reply was rejected. The complaint may have been closed. ' +
          'Refresh the complaint details before trying again.'
        );
        setSendBlocked(true);
      } else {
        setSendError(
          err instanceof Error
            ? err.message
            : 'Unable to send your reply.'
        );
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="mt-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Conversation
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Messages and updates about this complaint.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setReloadCount((count) => count + 1)
          }
          disabled={loading || sending}
          className="text-sm font-medium text-primary-600 disabled:opacity-50"
        >
          Refresh conversation
        </button>
      </div>

      <div
        aria-live="polite"
        className="mt-4 max-h-[420px] min-h-[160px] space-y-3 overflow-y-auto border-y border-ink-200 py-5 dark:border-ink-700"
      >
        {loading ? (
          <p role="status" className="text-sm text-ink-500">
            Loading conversation...
          </p>
        ) : error ? (
          <div role="alert" className="space-y-3">
            <p className="text-sm text-error-600">
              {error}
            </p>
            <button
              type="button"
              onClick={() =>
                setReloadCount((count) => count + 1)
              }
              className="text-sm text-primary-600"
            >
              Try again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-ink-500">
            No messages yet. You can ask for an update below.
          </p>
        ) : (
          messages.map((message) => {
            const mine =
              message.createdBy.id === currentUserId;

            const author = [
              message.createdBy.firstName,
              message.createdBy.lastName,
            ].filter(Boolean).join(' ') || 'User';

            return (
              <div
                key={message.id}
                className={
                  'flex ' +
                  (mine ? 'justify-end' : 'justify-start')
                }
              >
                <div
                  className={
                    'max-w-[85%] rounded-xl p-3 ' +
                    (mine
                      ? 'bg-primary-50 dark:bg-primary-950'
                      : 'bg-ink-50 dark:bg-ink-800')
                  }
                >
                  <p className="text-xs font-semibold">
                    {mine ? 'You' : author}
                  </p>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {message.message}
                  </p>

                  <time className="mt-2 block text-xs text-ink-500">
                    {new Date(message.createdAtUtc).toLocaleString()}
                  </time>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isClosed && (
        <p className="mt-4 text-sm text-ink-500">
          This complaint is closed. Previous messages are
          available to read, but new replies are disabled.
        </p>
      )}

      {!isClosed && (
        <form onSubmit={handleSend} className="mt-4">
          <label
            htmlFor="complaint-reply"
            className="mb-2 block text-sm font-medium"
          >
            Write a reply
          </label>

          <textarea
            id="complaint-reply"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={1000}
            rows={3}
            disabled={!canSend || sending}
            placeholder="Write your message to the complaint team..."
            className="w-full rounded-xl border border-ink-200 bg-transparent p-3 text-sm outline-none focus:border-primary-500 disabled:opacity-60 dark:border-ink-700"
          />

          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-ink-500">
              {draft.length}/1000 characters
            </span>

            <button
              type="submit"
              disabled={
                !canSend ||
                sending ||
                !draft.trim()
              }
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send reply'}
            </button>
          </div>

          {sendError && (
            <p role="alert" className="mt-3 text-sm text-error-600">
              {sendError}
            </p>
          )}
        </form>
      )}
    </Card>
  );
}
