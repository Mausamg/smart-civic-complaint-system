import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Play, FileText } from 'lucide-react';
import type { Evidence } from '@/types';

export function EvidenceGallery({ evidence, title }: { evidence: Evidence[]; title?: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (evidence.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 px-4 py-6 text-center text-sm text-ink-400 dark:border-ink-700 dark:bg-ink-900/50">
        No evidence attached
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {evidence.map((e, i) => (
          <button
            key={e.id}
            onClick={() => setLightbox(i)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-ink-200 bg-ink-50 dark:border-ink-700 dark:bg-ink-800"
            aria-label={`View evidence ${i + 1}: ${e.caption || e.url}`}
          >
            {e.type === 'image' ? (
              <img src={e.url} alt={e.caption || 'Complaint evidence'} className="h-full w-full object-cover transition group-hover:scale-105" />
            ) : e.type === 'video' ? (
              <div className="flex h-full w-full items-center justify-center bg-ink-800 text-white">
                <Play className="h-8 w-8" />
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-ink-400">
                <FileText className="h-8 w-8" />
              </div>
            )}
            {e.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/80 to-transparent p-2 text-left text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                {e.caption}
              </div>
            )}
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/90 p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Evidence preview">
          <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Close preview">
            <X className="h-5 w-5" />
          </button>
          {evidence.length > 1 && (
            <>
              <button
                onClick={() => setLightbox((p) => (p! - 1 + evidence.length) % evidence.length)}
                className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setLightbox((p) => (p! + 1) % evidence.length)}
                className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <div className="max-h-[85vh] max-w-4xl">
            {evidence[lightbox].type === 'image' ? (
              <img src={evidence[lightbox].url} alt={evidence[lightbox].caption || title || 'Evidence'} className="max-h-[85vh] rounded-xl object-contain" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-ink-900 text-white">
                <div className="text-center">
                  <Play className="mx-auto h-12 w-12" />
                  <p className="mt-3 text-sm">{evidence[lightbox].caption || 'Video evidence'}</p>
                </div>
              </div>
            )}
            {evidence[lightbox].caption && (
              <p className="mt-3 text-center text-sm text-white/80">{evidence[lightbox].caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
