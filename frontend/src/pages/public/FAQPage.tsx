import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { AccordionItem } from '@/components/ui/Accordion';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { faqItems } from '@/data/mockData';
import { cn } from '@/utils/format';

export function FAQPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const categories = useMemo(() => ['All', ...Array.from(new Set(faqItems.map((f) => f.category)))], []);

  const filtered = useMemo(() => {
    return faqItems.filter((f) => {
      const matchesCat = category === 'All' || f.category === category;
      const q = query.toLowerCase();
      const matchesQ = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [query, category]);

  return (
    <div className="container-page py-10">
      <PageHeader title="Frequently Asked Questions" subtitle="Find answers to common questions about reporting and tracking civic complaints." breadcrumbs={[{ label: 'FAQ' }]} />

      <div className="mx-auto mb-8 max-w-2xl">
        <SearchInput value={query} onChange={setQuery} placeholder="Search questions…" autoFocus className="w-full" />
      </div>

      <div className="mx-auto mb-8 flex max-w-2xl flex-wrap justify-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              category === c
                ? 'bg-primary-600 text-white'
                : 'border border-ink-200 text-ink-600 hover:border-primary-300 hover:bg-primary-50 dark:border-ink-700 dark:text-ink-300'
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-2xl space-y-3">
        {filtered.length > 0 ? (
          filtered.map((f) => <AccordionItem key={f.id} question={f.question} answer={f.answer} />)
        ) : (
          <EmptyState
            icon="SearchX"
            title="No matching questions"
            description="Try a different search term or browse all categories."
          />
        )}
      </div>

      <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-primary-100 bg-primary-50/50 p-6 text-center dark:border-primary-900 dark:bg-primary-950/20">
        <p className="text-sm font-semibold text-ink-900 dark:text-ink-100">Still have questions?</p>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">Our support team is here to help. Reach out through the contact page.</p>
        <a href="/contact" className="mt-4 inline-block rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700">Contact support</a>
      </div>
    </div>
  );
}
