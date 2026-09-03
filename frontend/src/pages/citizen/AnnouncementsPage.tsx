import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Search, Calendar, Paperclip, Pin } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { announcements } from '@/data/mockData';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/format';
import type { Announcement } from '@/types';

const categoryColors: Record<Announcement['category'], string> = {
  general: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-950/40 dark:text-primary-300 dark:border-primary-900',
  emergency: 'bg-error-50 text-error-700 border-error-200 dark:bg-error-950/40 dark:text-error-300 dark:border-error-900',
  maintenance: 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-950/40 dark:text-warning-300 dark:border-warning-900',
  policy: 'bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-950/40 dark:text-accent-300 dark:border-accent-900',
  event: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900',
};

export function AnnouncementsPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [selected, setSelected] = useState<Announcement | null>(null);

  const categories = ['All', ...Array.from(new Set(announcements.map((a) => a.category)))];
  const filtered = useMemo(() => {
    return announcements.filter((a) => {
      const q = query.toLowerCase();
      const matchesQ = !q || a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q);
      const matchesCat = !category || category === 'All' || a.category === category;
      return matchesQ && matchesCat;
    });
  }, [query, category]);

  const featured = filtered.find((a) => a.featured);

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Stay updated with the latest municipal news and notices." breadcrumbs={[{ label: 'Dashboard', to: '/citizen/dashboard' }, { label: 'Announcements' }]} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={query} onChange={setQuery} placeholder="Search announcements…" className="flex-1" />
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c === 'All' ? '' : c)} className={cn('rounded-full px-3 py-1.5 text-xs font-medium transition', (category === c || (!category && c === 'All')) ? 'bg-primary-600 text-white' : 'border border-ink-200 text-ink-600 hover:bg-ink-100 dark:border-ink-700')}>{c}</button>
          ))}
        </div>
      </div>

      {featured && (
        <Card className="mb-5 overflow-hidden p-0">
          <div className="flex flex-col gap-0 lg:flex-row">
            <div className="flex-1 p-6">
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-primary-600" />
                <span className="text-xs font-semibold uppercase text-primary-600">Featured</span>
                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', categoryColors[featured.category])}>{featured.category}</span>
              </div>
              <h2 className="mt-3 text-xl font-bold text-ink-900 dark:text-ink-100">{featured.title}</h2>
              <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{featured.body}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-ink-400">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(featured.publishedAt)}</span>
                <span>By {featured.author}</span>
                {featured.ward && <span className="rounded-full bg-ink-100 px-2 py-0.5 dark:bg-ink-800">{featured.ward}</span>}
              </div>
            </div>
            <div className="flex h-32 items-center justify-center bg-gradient-to-br from-primary-500 to-accent-500 p-8 lg:h-auto lg:w-48">
              <Megaphone className="h-12 w-12 text-white/90" />
            </div>
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon="Megaphone" title="No announcements found" description="Try a different search or category." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.filter((a) => !a.featured || a !== featured).map((a) => (
            <Card key={a.id} hover className="flex flex-col p-5" onClick={() => setSelected(a)}>
              <span className={cn('w-fit rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize', categoryColors[a.category])}>{a.category}</span>
              <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-ink-900 dark:text-ink-100">{a.title}</h3>
              <p className="mt-1.5 line-clamp-3 flex-1 text-xs text-ink-500">{a.body}</p>
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-[11px] text-ink-400 dark:border-ink-800">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(a.publishedAt)}</span>
                {a.ward && <span>{a.ward}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title} size="lg">
        {selected && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-medium capitalize', categoryColors[selected.category])}>{selected.category}</span>
              {selected.ward && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600 dark:bg-ink-800">{selected.ward}</span>}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{selected.body}</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4 text-xs text-ink-500 dark:border-ink-800">
              <div>
                <p>Published: {formatDate(selected.publishedAt)}</p>
                <p>By {selected.author}</p>
                {selected.expiresAt && <p>Expires: {formatDate(selected.expiresAt)}</p>}
              </div>
              <Button variant="outline" size="sm" leftIcon={<Paperclip className="h-4 w-4" />}>Attachment</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
