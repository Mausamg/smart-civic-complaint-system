import { useState, useMemo } from 'react';
import { List, Map as MapIcon, Filter, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { MapContainer } from '@/components/maps/MapContainer';
import { ComplaintCard } from '@/components/complaints/ComplaintCard';
import { Select } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { ComplaintDetailDrawer } from '@/components/complaints/ComplaintDetailDrawer';
import { complaints } from '@/data/mockData';
import { categoryOptions, statusOptions, categoryConfig, statusConfig } from '@/data/metadata';
import type { Complaint, ComplaintCategory, ComplaintStatus } from '@/types';
import { cn } from '@/utils/format';

export function PublicMapPage() {
  const [view, setView] = useState<'split' | 'map' | 'list'>('split');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [ward, setWard] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const wards = Array.from(new Set(complaints.map((c) => c.ward))).sort();

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      if (c.isPublic === false) return false;
      if (category && c.category !== category) return false;
      if (status && c.status !== status) return false;
      if (ward && c.ward !== ward) return false;
      return true;
    });
  }, [category, status, ward]);

  const markers = filtered.map((c) => ({
    id: c.id,
    lat: c.coordinates.lat,
    lng: c.coordinates.lng,
    status: c.status,
    label: c.title,
  }));

  const openDetail = (c: Complaint) => {
    setSelected(c);
    setDrawerOpen(true);
  };

  const reset = () => { setCategory(''); setStatus(''); setWard(''); };

  const FilterContent = () => (
    <div className="space-y-4">
      <Select label="Category" placeholder="All categories" value={category} onChange={(e) => setCategory(e.target.value)} options={categoryOptions.map((c) => ({ value: c, label: categoryConfig[c].label }))} />
      <Select label="Status" placeholder="All statuses" value={status} onChange={(e) => setStatus(e.target.value)} options={statusOptions.map((s) => ({ value: s, label: statusConfig[s].label }))} />
      <Select label="Ward" placeholder="All wards" value={ward} onChange={(e) => setWard(e.target.value)} options={wards.map((w) => ({ value: w, label: w }))} />
      <Button variant="ghost" size="sm" fullWidth onClick={reset}>Reset filters</Button>
    </div>
  );

  return (
    <div className="container-page py-10">
      <PageHeader
        title="Public Complaint Map"
        subtitle="Explore civic issues reported across the municipality. Citizen details are protected."
        breadcrumbs={[{ label: 'Public Map' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-ink-200 p-0.5 dark:border-ink-700">
              {([['list', 'List'], ['split', 'Split'], ['map', 'Map']] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition', view === v ? 'bg-primary-600 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300')}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" leftIcon={<Filter className="h-4 w-4" />} onClick={() => setFiltersOpen(true)} className="lg:hidden">Filters</Button>
          </div>
        }
      />

      <div className="mb-4 rounded-xl border border-ink-100 bg-ink-50/60 px-4 py-2.5 text-xs text-ink-500 dark:border-ink-800 dark:bg-ink-900/40">
        <strong className="text-ink-700 dark:text-ink-300">Privacy note:</strong> Only complaint locations and details are shown. No personal citizen information is displayed publicly.
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(view === 'split' || view === 'list') && (
          <div className={cn(view === 'split' ? 'lg:col-span-1' : 'lg:col-span-3')}>
            <div className="hidden lg:block">
              <div className="card mb-3 p-4">
                <FilterContent />
              </div>
            </div>
            <div className="flex items-center justify-between px-1 py-2">
              <p className="text-sm text-ink-500">{filtered.length} complaints shown</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {filtered.map((c) => (
                <div key={c.id} onClick={() => openDetail(c)}>
                  <ComplaintCard complaint={c} linkTo="#" />
                </div>
              ))}
            </div>
          </div>
        )}

        {(view === 'split' || view === 'map') && (
          <div className={cn(view === 'split' ? 'lg:col-span-2' : 'lg:col-span-3')}>
            <MapContainer
              height="h-[600px]"
              markers={markers}
              showLegend
              className="w-full"
            >
              <div className="pointer-events-none absolute right-3 top-16 rounded-lg bg-white/90 px-3 py-2 text-xs shadow-soft backdrop-blur">
                <p className="font-semibold text-ink-700">{filtered.length} markers</p>
                <p className="text-ink-400">Click a marker or list item</p>
              </div>
            </MapContainer>
          </div>
        )}
      </div>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" side="left">
        <div className="p-4"><FilterContent /></div>
      </Drawer>

      <ComplaintDetailDrawer
        complaint={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isPublic
      />
    </div>
  );
}
