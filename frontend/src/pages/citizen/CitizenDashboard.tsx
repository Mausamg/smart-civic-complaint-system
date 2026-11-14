import { CitizenComplaintCard } from '@/components/complaints/CitizenComplaintCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useApp } from '@/context/AppContext';
import {
  getMyNotifications,
  NOTIFICATIONS_CHANGED_EVENT,
  type NotificationApiResponse,
} from '@/services/notificationService';
import {
  getMyComplaints,
  type ComplaintApiResponse,
} from '@/services/complaintService';
import {
  ANNOUNCEMENTS_FEED_CHANGED_EVENT,
  ANNOUNCEMENTS_FEED_STORAGE_KEY,
  getPublishedAnnouncements,
  type AnnouncementApiResponse,
} from '@/services/announcementService';
import { useEffect, useMemo, useState } from 'react';
import { formatDate,timeAgo } from '@/utils/format';
import { AlertTriangle,ArrowRight,ArrowUpRight,Bell,FilePlus2,Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,Tooltip
} from 'recharts';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  underreview: 'Under Review',
  assigned: 'Assigned',
  inprogress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Resolved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const STATUS_COLORS: Record<string, string> = {
  Submitted: '#3b82f6',
  'Under Review': '#a855f7',
  Assigned: '#f97316',
  'In Progress': '#f59e0b',
  Resolved: '#22c55e',
  Rejected: '#ef4444',
  Withdrawn: '#64748b',
};

const STATUS_ORDER = [
  'Submitted',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved',
  'Rejected',
  'Withdrawn',
];

function statusLabel(value: string): string {
  const normalized = value.replace(/[^a-z]/gi, '').toLowerCase();
  return STATUS_LABELS[normalized] ?? value;
}

export function CitizenDashboard() {
  const { user, accessToken } = useApp();
  const [myComplaints, setMyComplaints] =
    useState<ComplaintApiResponse[]>([]);

  const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [complaintsError, setComplaintsError] =
    useState<string | null>(null);
  const [complaintsRetry, setComplaintsRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let requestId = 0;
    let loadedOnce = false;

    const loadComplaints = (initial: boolean) => {
      const current = ++requestId;

      if (!accessToken) {
        setMyComplaints([]);
        setComplaintsError('Sign in to view your complaints.');
        setComplaintsLoading(false);
        return;
      }

      if (initial) {
        setComplaintsLoading(true);
        setComplaintsError(null);
      }

      void getMyComplaints(accessToken)
        .then((data) => {
          if (!active || current !== requestId) return;

          loadedOnce = true;
          setMyComplaints(data);
          setComplaintsError(null);
        })
        .catch((error: unknown) => {
          if (!active || current !== requestId) return;

          if (!loadedOnce) {
            setComplaintsError(
              error instanceof Error
                ? error.message
                : 'Unable to load complaints.'
            );
          }
        })
        .finally(() => {
          if (active && current === requestId) {
            setComplaintsLoading(false);
          }
        });
    };

    loadComplaints(true);

    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') {
        loadComplaints(false);
      }
    };

    const interval = window.setInterval(refreshOnReturn, 30000);

    document.addEventListener(
      'visibilitychange',
      refreshOnReturn
    );
    window.addEventListener('focus', refreshOnReturn);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener(
        'visibilitychange',
        refreshOnReturn
      );
      window.removeEventListener('focus', refreshOnReturn);
    };
  }, [accessToken, complaintsRetry]);

  const pending = myComplaints.filter((item) =>
    ['Submitted', 'Under Review', 'Assigned']
      .includes(statusLabel(item.status))
  ).length;

  const inProgress = myComplaints.filter(
    (item) => statusLabel(item.status) === 'In Progress'
  ).length;

  const resolved = myComplaints.filter(
    (item) => statusLabel(item.status) === 'Resolved'
  ).length;

  const recent = useMemo(
    () => [...myComplaints]
      .sort((a, b) =>
        new Date(b.updatedAt ?? b.createdAt).getTime() -
        new Date(a.updatedAt ?? a.createdAt).getTime()
      )
      .slice(0, 3),
    [myComplaints]
  );

  const recentSubmitted = useMemo(
    () => [...myComplaints]
      .sort((a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      )
      .slice(0, 2),
    [myComplaints]
  );

  const statusDistribution = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of myComplaints) {
      const label = statusLabel(item.status);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort(([a], [b]) => {
        const position = (name: string) => {
          const index = STATUS_ORDER.indexOf(name);
          return index < 0 ? 99 : index;
        };
        return position(a) - position(b);
      })
      .map(([name, value]) => ({
        name,
        value,
        color: STATUS_COLORS[name] ?? '#64748b',
      }));
  }, [myComplaints]);

  const statValue = (value: number): string | number =>
    complaintsLoading || complaintsError ? '—' : value;

  const [liveNotifications, setLiveNotifications] =
    useState<NotificationApiResponse[]>([]);

  const [notificationsLoading, setNotificationsLoading] =
    useState(true);

  const [notificationsError, setNotificationsError] =
    useState<string | null>(null);

  const [notificationsRetry, setNotificationsRetry] =
    useState(0);

  useEffect(() => {
    let active = true;
    let requestId = 0;
    let loadedOnce = false;

    setLiveNotifications([]);
    setNotificationsLoading(true);
    setNotificationsError(null);

    if (!accessToken) {
      setNotificationsError('Sign in to view notifications.');
      setNotificationsLoading(false);
      return;
    }

    const refreshNotifications = () => {
      const current = ++requestId;

      void getMyNotifications(accessToken)
        .then((data) => {
          if (!active || current !== requestId) return;

          loadedOnce = true;
          setLiveNotifications(data);
          setNotificationsError(null);
        })
        .catch((error: unknown) => {
          if (!active || current !== requestId) return;

          // Keep previously loaded messages visible
          // if a background refresh temporarily fails.
          if (!loadedOnce) {
            setNotificationsError(
              error instanceof Error
                ? error.message
                : 'Unable to load notifications.'
            );
          }
        })
        .finally(() => {
          if (active && current === requestId) {
            setNotificationsLoading(false);
          }
        });
    };

    refreshNotifications();

    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') {
        refreshNotifications();
      }
    };

    const pollId = window.setInterval(
      refreshOnReturn,
      30000
    );

    document.addEventListener(
      'visibilitychange',
      refreshOnReturn
    );

    window.addEventListener(
      'focus',
      refreshOnReturn
    );

    window.addEventListener(
      NOTIFICATIONS_CHANGED_EVENT,
      refreshNotifications
    );

    return () => {
      active = false;
      window.clearInterval(pollId);

      document.removeEventListener(
        'visibilitychange',
        refreshOnReturn
      );

      window.removeEventListener(
        'focus',
        refreshOnReturn
      );

      window.removeEventListener(
        NOTIFICATIONS_CHANGED_EVENT,
        refreshNotifications
      );
    };
  }, [accessToken, notificationsRetry]);

  const unreadNotifications = liveNotifications.filter(
    (item) => !item.isRead
  ).length;

  const recentNotifications = [...liveNotifications]
    .sort((a, b) =>
      new Date(b.createdAtUtc).getTime() -
      new Date(a.createdAtUtc).getTime()
    )
    .slice(0, 4);

  const [liveAnnouncements, setLiveAnnouncements] =
    useState<AnnouncementApiResponse[]>([]);

  const [announcementsLoading, setAnnouncementsLoading] =
    useState(true);

  const [announcementsError, setAnnouncementsError] =
    useState<string | null>(null);

  const [announcementsRetry, setAnnouncementsRetry] =
    useState(0);

  useEffect(() => {
    let active = true;
    let sequence = 0;
    let controller: AbortController | null = null;
    let loadedOnce = false;

    const refreshAnnouncements = () => {
      const current = ++sequence;

      controller?.abort();
      const nextController = new AbortController();
      controller = nextController;

      void getPublishedAnnouncements(nextController.signal)
        .then((data) => {
          if (!active || current !== sequence) return;

          loadedOnce = true;
          setLiveAnnouncements(data);
          setAnnouncementsError(null);
        })
        .catch((error: unknown) => {
          if (
            !active ||
            current !== sequence ||
            nextController.signal.aborted
          ) return;

          // Preserve existing notices on temporary failures.
          if (!loadedOnce) {
            setAnnouncementsError(
              error instanceof Error
                ? error.message
                : 'Unable to load announcements.'
            );
          }
        })
        .finally(() => {
          if (active && current === sequence) {
            setAnnouncementsLoading(false);
          }
        });
    };

    refreshAnnouncements();

    // Poll while this dashboard is visible.
    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshAnnouncements();
      }
    }, 15000);

    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') {
        refreshAnnouncements();
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === ANNOUNCEMENTS_FEED_STORAGE_KEY) {
        refreshAnnouncements();
      }
    };

    document.addEventListener(
      'visibilitychange',
      refreshOnReturn
    );

    window.addEventListener('focus', refreshOnReturn);

    window.addEventListener(
      ANNOUNCEMENTS_FEED_CHANGED_EVENT,
      refreshAnnouncements
    );

    window.addEventListener('storage', onStorage);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(pollId);

      document.removeEventListener(
        'visibilitychange',
        refreshOnReturn
      );

      window.removeEventListener('focus', refreshOnReturn);

      window.removeEventListener(
        ANNOUNCEMENTS_FEED_CHANGED_EVENT,
        refreshAnnouncements
      );

      window.removeEventListener('storage', onStorage);
    };
  }, [announcementsRetry]);

  const featuredAnn =
    liveAnnouncements.find((a) => a.isFeatured) ??
    liveAnnouncements[0];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]}`}
        subtitle={
          user?.ward
              ? `Here is an overview of your civic complaints in ${user.ward}.`
              : 'Here is an overview of your civic complaints.'
        }
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={<Link to="/citizen/report"><Button leftIcon={<FilePlus2 className="h-4 w-4" />}>Report New Complaint</Button></Link>}
      />

      {/* Emergency notice */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-error-200 bg-error-50 p-4 dark:border-error-900 dark:bg-error-950/30">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error-600" />
        <div className="text-sm text-error-800 dark:text-error-300">
          <p className="font-semibold">Emergency reporting notice</p>
          <p className="mt-0.5">This system is not for emergencies. For urgent safety issues call Police 100, Ambulance 102, or Fire 101.</p>
        </div>
      </div>

      {complaintsError && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-900 dark:bg-error-950/30"
        >
          <p className="text-sm text-error-700 dark:text-error-300">
            {complaintsError}
          </p>
          <button
            type="button"
            onClick={() => setComplaintsRetry((n) => n + 1)}
            className="rounded-lg border border-error-300 px-3 py-1.5 text-xs font-semibold text-error-700 hover:bg-error-100 dark:text-error-300"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Complaints" value={statValue(myComplaints.length)} icon="FileText" iconBg="blue" />
        <StatCard label="Pending" value={statValue(pending)} icon="Clock" iconBg="amber" />
        <StatCard label="In Progress" value={statValue(inProgress)} icon="Loader" iconBg="purple" />
        <StatCard label="Resolved" value={statValue(resolved)} icon="CheckCircle2" iconBg="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Chart */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
              Complaint status overview
            </h3>

            {complaintsLoading ? (
              <p className="mt-5 text-sm text-ink-500">
                Loading complaint statistics...
              </p>
            ) : complaintsError ? (
              <p className="mt-5 text-sm text-ink-500">
                Statistics are temporarily unavailable.
              </p>
            ) : statusDistribution.length === 0 ? (
              <p className="mt-5 text-sm text-ink-500">
                No complaints submitted yet.
              </p>
            ) : (
              <div className="mt-4 grid items-center gap-4 sm:grid-cols-2">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {statusDistribution.map((item) => (
                          <Cell
                            key={item.name}
                            fill={item.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #e5e7eb',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {statusDistribution.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.name}
                      </span>
                      <span className="font-semibold text-ink-900 dark:text-ink-100">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Recent complaints */}
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
                Recent activity
              </h3>
              <Link
                to="/citizen/complaints"
                className="text-xs font-medium text-primary-600 hover:underline"
              >
                View all
              </Link>
            </div>

            {complaintsLoading ? (
              <p className="mt-4 text-sm text-ink-500">
                Loading recent complaints...
              </p>
            ) : complaintsError ? (
              <p className="mt-4 text-sm text-ink-500">
                Recent activity is unavailable.
              </p>
            ) : recent.length === 0 ? (
              <p className="mt-4 text-sm text-ink-500">
                No complaint activity yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {recent.map((item) => (
                  <Link
                    key={item.id}
                    to={`/citizen/complaints/${encodeURIComponent(item.id)}`}
                    className="group flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50/40 hover:shadow-sm focus-visible:border-primary-400 motion-reduce:transform-none dark:border-ink-800 dark:hover:bg-primary-950/20"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900 group-hover:text-primary-600 dark:text-ink-100">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        ID: {item.id.slice(0, 8)} · Updated{' '}
                        {timeAgo(item.updatedAt ?? item.createdAt)}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                      {statusLabel(item.status)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Recently submitted */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
                Recently submitted
              </h3>
              <Link
                to="/citizen/report"
                className="text-xs font-medium text-primary-600 hover:underline"
              >
                Report new
              </Link>
            </div>

            {complaintsLoading ? (
              <p className="text-sm text-ink-500">
                Loading recent submissions...
              </p>
            ) : complaintsError ? (
              <p className="text-sm text-ink-500">
                Recent submissions are unavailable.
              </p>
            ) : recentSubmitted.length === 0 ? (
              <p className="text-sm text-ink-500">
                You haven't submitted any complaints yet.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {recentSubmitted.map((item) => (
                  <CitizenComplaintCard
                    key={item.id}
                    complaint={item}
                  />
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="space-y-6">
          {/* Announcements */}
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Announcements</h3>
            </div>
            {announcementsLoading ? (
              <p role="status" className="mt-3 text-xs text-ink-500">
                Loading announcements...
              </p>
            ) : announcementsError ? (
              <div role="alert" className="mt-3 space-y-2">
                <p className="text-xs text-error-600">
                  {announcementsError}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAnnouncementsLoading(true);
                    setAnnouncementsRetry((n) => n + 1);
                  }}
                  className="text-xs font-semibold text-primary-600 hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : featuredAnn ? (
              <Link
                to="/citizen/announcements"
                className="group relative mt-3 block overflow-hidden rounded-xl border border-primary-100 bg-primary-50/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary-300 hover:shadow-lg focus-visible:border-primary-400 motion-reduce:transform-none dark:border-primary-900 dark:bg-primary-950/20"
                aria-label={`View announcement: ${featuredAnn.title}`}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 to-accent-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
                <p className="text-xs font-semibold uppercase text-primary-600">
                  {featuredAnn.category}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink-900 transition-colors group-hover:text-primary-600 dark:text-ink-100">
                  {featuredAnn.title}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-ink-500">
                  {featuredAnn.body}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-ink-500">
                  <span>
                    {formatDate(
                      featuredAnn.publishedAtUtc ??
                      featuredAnn.createdAtUtc
                    )}
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-4 w-4 text-primary-600 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
                  />
                </div>
              </Link>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-ink-200 p-4 text-center text-xs text-ink-500 dark:border-ink-700">
                No published announcements yet.
              </p>
            )}
            <Link to="/citizen/announcements" className="mt-3 block text-center text-xs font-medium text-primary-600 hover:underline">View all announcements</Link>
          </Card>

          {/* Live Notifications */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary-600" />
                <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
                  Notifications
                </h3>
              </div>

              {unreadNotifications > 0 && (
                <span
                  className="rounded-full bg-error-500 px-2 py-0.5 text-[10px] font-bold text-white"
                  aria-label={`${unreadNotifications} unread notifications`}
                >
                  {unreadNotifications > 99
                    ? '99+'
                    : unreadNotifications}
                </span>
              )}
            </div>

            {notificationsLoading ? (
              <p role="status" className="mt-4 text-xs text-ink-500">
                Loading notifications...
              </p>
            ) : notificationsError ? (
              <div role="alert" className="mt-4 space-y-2">
                <p className="text-xs text-error-600">
                  {notificationsError}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setNotificationsLoading(true);
                    setNotificationsRetry((n) => n + 1);
                  }}
                  className="text-xs font-medium text-primary-600 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : recentNotifications.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-ink-200 p-4 text-center text-xs text-ink-500 dark:border-ink-700">
                No notifications yet.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {recentNotifications.map((item) => (
                  <Link
                    key={item.id}
                    to="/citizen/notifications"
                    aria-label={`View notification: ${item.title}`}
                    className={`group flex gap-2.5 rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-sm focus-visible:border-primary-400 motion-reduce:transform-none ${
                      !item.isRead
                        ? 'border-primary-100 bg-primary-50/40 dark:border-primary-900 dark:bg-primary-950/20'
                        : 'border-transparent hover:bg-ink-50 dark:hover:bg-ink-800/50'
                    }`}
                  >
                    {!item.isRead && (
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500"
                      />
                    )}

                    <div
                      className={`min-w-0 flex-1 ${
                        item.isRead ? 'pl-4' : ''
                      }`}
                    >
                      <p className="line-clamp-2 break-words text-xs font-semibold text-ink-900 group-hover:text-primary-600 dark:text-ink-100">
                        {item.title}
                      </p>

                      <p className="mt-1 line-clamp-2 break-words text-[11px] text-ink-500">
                        {item.message}
                      </p>

                      <p className="mt-1 text-[10px] text-ink-400">
                        {timeAgo(item.createdAtUtc)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <Link
              to="/citizen/notifications"
              className="mt-3 block text-center text-xs font-medium text-primary-600 hover:underline"
            >
              View all notifications
            </Link>
          </Card>

          {/* Quick links */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">Quick links</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'My Complaints', to: '/citizen/complaints', icon: 'ListTodo' },
                { label: 'Track', to: '/track', icon: 'Search' },
                { label: 'Public Map', to: '/map', icon: 'Map' },
                { label: 'Feedback', to: '/citizen/feedback', icon: 'MessageSquare' },
              ].map((q) => (
                <Link key={q.to} to={q.to} className="flex items-center gap-2 rounded-xl border border-ink-100 px-3 py-2.5 text-xs font-medium text-ink-700 transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-ink-800 dark:text-ink-200 dark:hover:bg-primary-950/20">
                  <ArrowRight className="h-3.5 w-3.5 text-primary-500" /> {q.label}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
