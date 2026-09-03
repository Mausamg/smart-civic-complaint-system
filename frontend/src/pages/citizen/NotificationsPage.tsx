import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, Filter } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Form';
import { useApp } from '@/context/AppContext';
import { notifications as initial } from '@/data/mockData';
import { timeAgo } from '@/utils/format';
import { cn } from '@/utils/format';
import type { Notification } from '@/types';

const typeLabels: Record<Notification['type'], string> = {
  complaint_update: 'Complaint Updates',
  assignment: 'Assignments',
  comment: 'Comments',
  resolution: 'Resolutions',
  escalation: 'Escalations',
  announcement: 'Announcements',
};

export function NotificationsPage({ linkPrefix = '/citizen' }: { linkPrefix?: string }) {
  const { addToast } = useApp();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState('');

  const filtered = filter ? items.filter((n) => n.type === filter) : items;
  const unread = items.filter((n) => !n.read).length;

  const markRead = (id: string) => setItems((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const markAll = () => { setItems((p) => p.map((n) => ({ ...n, read: true }))); addToast({ type: 'success', title: 'All marked as read' }); };
  const remove = (id: string) => { setItems((p) => p.filter((n) => n.id !== id)); addToast({ type: 'info', title: 'Notification deleted' }); };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${unread} unread of ${items.length} total notifications.`}
        breadcrumbs={[{ label: 'Dashboard', to: `${linkPrefix}/dashboard` }, { label: 'Notifications' }]}
        actions={
          <Button variant="outline" size="sm" leftIcon={<CheckCheck className="h-4 w-4" />} onClick={markAll} disabled={unread === 0}>Mark all read</Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="All types" options={Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l }))} className="w-auto" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="Bell" title="No notifications" description="You are all caught up. New notifications will appear here." />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card key={n.id} className={cn('p-4 transition', !n.read && 'border-primary-200 bg-primary-50/30 dark:border-primary-900 dark:bg-primary-950/20')}>
              <div className="flex items-start gap-3">
                <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', !n.read ? 'bg-primary-100 text-primary-600 dark:bg-primary-900' : 'bg-ink-100 text-ink-400 dark:bg-ink-800')}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">{n.title}</p>
                      <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">{n.message}</p>
                      <p className="mt-1 text-xs text-ink-400">{timeAgo(n.timestamp)} · {typeLabels[n.type]}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {n.link && <Link to={n.link} onClick={() => markRead(n.id)} className="text-xs font-medium text-primary-600 hover:underline">View →</Link>}
                    {!n.read && <button onClick={() => markRead(n.id)} className="flex items-center gap-1 text-xs text-ink-500 hover:text-success-600"><Check className="h-3.5 w-3.5" /> Mark read</button>}
                    <button onClick={() => remove(n.id)} className="flex items-center gap-1 text-xs text-ink-500 hover:text-error-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
