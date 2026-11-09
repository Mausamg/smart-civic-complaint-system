import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { ApiError } from '@/services/apiClient';
import {
  getAssignedComplaints,
  type ComplaintApiResponse,
} from '@/services/complaintService';
import {
  addComplaintComment,
  getComplaintComments,
  type ComplaintCommentApiResponse,
} from '@/services/complaintCommentService';

import {
  getMyNotifications,
  markNotificationAsRead,
} from '@/services/notificationService';

export function StaffMessagesPage() {
  const { accessToken, user } = useApp();
  const lastConversationKey = useRef<string | null>(null);

  const [complaints, setComplaints] =
    useState<ComplaintApiResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [listRetry, setListRetry] = useState(0);

  const [messages, setMessages] =
    useState<ComplaintCommentApiResponse[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [conversationError, setConversationError] =
    useState<string | null>(null);
  const [conversationRetry, setConversationRetry] = useState(0);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Load only complaints assigned to the authenticated staff member.
  useEffect(() => {
    let cancelled = false;

    setListLoading(true);
    setListError(null);

    if (!accessToken) {
      setComplaints([]);
      setSelectedId(null);
      setListError('Please sign in as a staff member.');
      setListLoading(false);
      return;
    }

    getAssignedComplaints(accessToken)
      .then((data) => {
        if (cancelled) return;

        setComplaints(data);
        setSelectedId((current) =>
          current && data.some((item) => item.id === current)
            ? current
            : data[0]?.id ?? null
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setComplaints([]);
        setSelectedId(null);
        setListError(
          error instanceof Error
            ? error.message
            : 'Unable to load assigned complaints.'
        );
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, listRetry]);

  // Load the selected complaint's conversation.
  useEffect(() => {
    let cancelled = false;

    const key = selectedId && accessToken
      ? `${selectedId}:${accessToken}`
      : null;

    const changed = lastConversationKey.current !== key;
    lastConversationKey.current = key;

    // Preserve existing messages during background refresh.
    if (changed) {
      setMessages([]);
    }

    setConversationError(null);

    if (!selectedId || !accessToken) {
      setMessagesLoading(false);
      return;
    }

    if (changed) setMessagesLoading(true);

    const viewedAt = Date.now();

    getComplaintComments(selectedId, accessToken)
      .then((data) => {
        if (cancelled) return;

        setMessages(data);

        // Only mark already-existing replies for this complaint.
        // Notification errors must not block conversation viewing.
        void getMyNotifications(accessToken)
          .then(async (notifications) => {
            if (cancelled) return;

            const unreadReplies = notifications.filter(
              (item) =>
                !item.isRead &&
                item.title === 'New citizen reply' &&
                item.complaintId === selectedId &&
                Date.parse(item.createdAtUtc) <= viewedAt
            );

            await Promise.allSettled(
              unreadReplies.map((item) =>
                markNotificationAsRead(item.id, accessToken)
              )
            );
          })
          .catch(() => {
            // Keep the conversation usable if notifications fail.
          });
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        if (error instanceof ApiError && error.status === 403) {
          setConversationError(
            'You no longer have access to this conversation. ' +
            'The complaint may have been reassigned.'
          );
          setListRetry((count) => count + 1);
        } else {
          setConversationError(
            error instanceof Error
              ? error.message
              : 'Unable to load the conversation.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, accessToken, conversationRetry]);

  // Refresh the open conversation without reloading the page.
  useEffect(() => {
    if (!selectedId || !accessToken) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        setConversationRetry((count) => count + 1);
      }
    };

    const pollId = window.setInterval(
      refreshIfVisible,
      15000
    );

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
  }, [selectedId, accessToken]);

  const selectedComplaint = complaints.find(
    (item) => item.id === selectedId
  );

  const isClosed = selectedComplaint
    ? ['Resolved', 'Rejected', 'Withdrawn'].includes(
        selectedComplaint.status
      )
    : true;

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = draft.trim();

    if (
      !accessToken ||
      !selectedComplaint ||
      isClosed ||
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
        selectedComplaint.id,
        message,
        accessToken
      );

      setDraft('');
      setConversationRetry((count) => count + 1);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 403) {
        setSendError(
          'Access denied. This complaint may have been reassigned.'
        );
        setListRetry((count) => count + 1);
      } else if (error instanceof ApiError && error.status === 400) {
        setSendError(
          'The message could not be sent. ' +
          'The complaint may have been closed.'
        );
        setListRetry((count) => count + 1);
      } else {
        setSendError(
          error instanceof Error
            ? error.message
            : 'Unable to send your message.'
        );
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Communicate with citizens about your assigned complaints."
        breadcrumbs={[
          { label: 'Dashboard', to: '/staff/dashboard' },
          { label: 'Messages' },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Assigned complaints</h2>
            <button
              type="button"
              onClick={() => setListRetry((count) => count + 1)}
              disabled={listLoading || sending}
              className="text-sm text-primary-600 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {listLoading ? (
            <p role="status" className="text-sm text-ink-500">
              Loading assigned complaints...
            </p>
          ) : listError ? (
            <p role="alert" className="text-sm text-error-600">
              {listError}
            </p>
          ) : complaints.length === 0 ? (
            <p className="text-sm text-ink-500">
              You have no active assigned complaints.
            </p>
          ) : (
            <div className="space-y-2">
              {complaints.map((complaint) => (
                <button
                  key={complaint.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(complaint.id);
                    setDraft('');
                    setSendError(null);
                  }}
                  disabled={sending}
                  aria-pressed={selectedId === complaint.id}
                  className={
                    'w-full rounded-xl border p-3 text-left ' +
                    'transition-colors disabled:opacity-60 ' +
                    (selectedId === complaint.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                      : 'border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800')
                  }
                >
                  <span className="block text-sm font-semibold">
                    {complaint.title}
                  </span>
                  <span className="mt-1 block text-xs text-ink-500">
                    {complaint.status} · {complaint.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          {!selectedComplaint ? (
            <p className="py-12 text-center text-sm text-ink-500">
              Select an assigned complaint to view its conversation.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 pb-4 dark:border-ink-700">
                <div>
                  <h2 className="font-semibold">
                    {selectedComplaint.title}
                  </h2>
                  <p className="mt-1 text-xs text-ink-500">
                    {selectedComplaint.status}
                  </p>
                  <Link
                    to={`/staff/complaints/${encodeURIComponent(selectedComplaint.id)}`}
                    className="mt-2 inline-block text-xs text-primary-600"
                  >
                    View complaint details
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setConversationRetry((count) => count + 1)
                  }
                  disabled={messagesLoading || sending}
                  className="text-sm text-primary-600 disabled:opacity-50"
                >
                  Refresh conversation
                </button>
              </div>

              <div
                aria-live="polite"
                className="max-h-[480px] min-h-[280px] space-y-4 overflow-y-auto py-5"
              >
                {messagesLoading ? (
                  <p role="status" className="text-sm text-ink-500">
                    Loading conversation...
                  </p>
                ) : conversationError ? (
                  <p role="alert" className="text-sm text-error-600">
                    {conversationError}
                  </p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-ink-500">
                    No messages yet. Start the conversation below.
                  </p>
                ) : (
                  messages.map((message) => {
                    const mine = message.createdBy.id === user?.id;
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
                            {new Date(message.createdAtUtc)
                              .toLocaleString()}
                          </time>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSend} className="border-t border-ink-200 pt-4 dark:border-ink-700">
                <label
                  htmlFor="staff-message"
                  className="mb-2 block text-sm font-medium"
                >
                  Your reply
                </label>
                <textarea
                  id="staff-message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  disabled={isClosed || sending || !!conversationError}
                  placeholder={
                    isClosed
                      ? 'This complaint is closed.'
                      : 'Write a message to the citizen...'
                  }
                  className="w-full rounded-xl border border-ink-200 bg-transparent p-3 text-sm outline-none focus:border-primary-500 disabled:opacity-60 dark:border-ink-700"
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-ink-500">
                    {draft.length}/1000 characters
                  </span>
                  <button
                    type="submit"
                    disabled={
                      sending ||
                      isClosed ||
                      !!conversationError ||
                      !draft.trim()
                    }
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {sending ? 'Sending...' : 'Send message'}
                  </button>
                </div>

                {sendError && (
                  <p role="alert" className="mt-3 text-sm text-error-600">
                    {sendError}
                  </p>
                )}
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
