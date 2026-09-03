import { useRef, useState, useCallback, type ReactNode } from 'react';
import { MapPin, Plus, Minus, Layers, Crosshair, Search, Maximize2 } from 'lucide-react';
import { cn } from '@/utils/format';
import { statusConfig } from '@/data/metadata';
import type { ComplaintStatus } from '@/types';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  status: ComplaintStatus;
  label?: string;
}

interface MapContainerProps {
  center?: { lat: number; lng: number };
  markers?: MapMarker[];
  height?: string;
  className?: string;
  draggableMarker?: boolean;
  onMarkerDrag?: (lat: number, lng: number) => void;
  showControls?: boolean;
  showLegend?: boolean;
  children?: ReactNode;
}

export function MapContainer({
  center = { lat: 27.7172, lng: 85.3249 },
  markers = [],
  height = 'h-96',
  className,
  draggableMarker = false,
  onMarkerDrag,
  showControls = true,
  showLegend = false,
  children,
}: MapContainerProps) {
  const [zoom, setZoom] = useState(13);
  const [satellite, setSatellite] = useState(false);
  const [dragPos, setDragPos] = useState(center);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const project = useCallback(
    (lat: number, lng: number) => {
      const range = 0.08 / (zoom / 13);
      const x = 50 + ((lng - center.lng) / range) * 50;
      const y = 50 - ((lat - center.lat) / range) * 50;
      return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
    },
    [zoom, center]
  );

  const toLatLng = (x: number, y: number) => {
    const range = 0.08 / (zoom / 13);
    const lng = center.lng + ((x - 50) / 50) * range;
    const lat = center.lat - ((y - 50) / 50) * range;
    return { lat, lng };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const { lat, lng } = toLatLng(x, y);
    setDragPos({ lat, lng });
    onMarkerDrag?.(lat, lng);
  };

  const gridLines = Array.from({ length: 9 }, (_, i) => (i + 1) * 10);

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-ink-200', className)} role="img" aria-label="Interactive map showing complaint locations">
      <div
        ref={containerRef}
        className={cn('relative w-full', height)}
        style={{
          background: satellite
            ? 'radial-gradient(circle at 30% 40%, #3b5e4a 0%, #2d4a3a 40%, #1e3328 100%)'
            : 'linear-gradient(135deg, #e8eef5 0%, #dce6f0 50%, #d0dcea 100%)',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={() => (dragging.current = false)}
        onMouseLeave={() => (dragging.current = false)}
      >
        {/* grid */}
        <div className="pointer-events-none absolute inset-0">
          {gridLines.map((p) => (
            <div key={`v${p}`} className="absolute top-0 bottom-0 border-l border-ink-300/30" style={{ left: `${p}%` }} />
          ))}
          {gridLines.map((p) => (
            <div key={`h${p}`} className="absolute left-0 right-0 border-t border-ink-300/30" style={{ top: `${p}%` }} />
          ))}
        </div>

        {/* fake roads */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-60" preserveAspectRatio="none">
          <path d="M 0 35% Q 30% 25%, 50% 45% T 100% 40%" stroke={satellite ? '#5a5a4a' : '#fff'} strokeWidth="6" fill="none" />
          <path d="M 20% 0 Q 25% 40%, 45% 60% T 60% 100%" stroke={satellite ? '#5a5a4a' : '#fff'} strokeWidth="5" fill="none" />
          <path d="M 0 70% L 100% 65%" stroke={satellite ? '#4a4a3a' : '#f0f0f0'} strokeWidth="4" fill="none" />
          <path d="M 70% 0 L 75% 100%" stroke={satellite ? '#4a4a3a' : '#f0f0f0'} strokeWidth="3" fill="none" />
        </svg>

        {/* river */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-50" preserveAspectRatio="none">
          <path d="M 0 80% Q 40% 75%, 60% 85% T 100% 82%" stroke={satellite ? '#2d4a6a' : '#a8c8e8'} strokeWidth="12" fill="none" strokeLinecap="round" />
        </svg>

        {/* center pin (draggable) */}
        {draggableMarker && (
          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-full cursor-move"
            style={{ left: `${project(dragPos.lat, dragPos.lng).x}%`, top: `${project(dragPos.lat, dragPos.lng).y}%` }}
            onMouseDown={() => (dragging.current = true)}
            role="slider"
            aria-label="Draggable location marker"
            aria-grabbed={dragging.current}
          >
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white shadow-float ring-4 ring-primary-600/30">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="h-2 w-1 bg-primary-600" />
            </div>
          </div>
        )}

        {/* markers */}
        {!draggableMarker &&
          markers.map((m) => {
            const { x, y } = project(m.lat, m.lng);
            const cfg = statusConfig[m.status];
            return (
              <div
                key={m.id}
                className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className={cn('relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-md transition group-hover:scale-125', cfg.dot)}>
                  <MapPin className="h-3.5 w-3.5 text-white" />
                </div>
                {m.label && (
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-float transition group-hover:opacity-100">
                    {m.label}
                  </div>
                )}
              </div>
            );
          })}

        {/* children overlay (list, etc.) */}
        {children}

        {/* map label */}
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-lg bg-white/80 px-2 py-1 text-[10px] font-medium text-ink-500 backdrop-blur dark:bg-ink-900/80">
          Map data © OpenStreetMap placeholder
        </div>
      </div>

      {/* controls */}
      {showControls && (
        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          <button onClick={() => setZoom((z) => Math.min(18, z + 1))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink-600 shadow-soft hover:bg-ink-50" aria-label="Zoom in">
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={() => setZoom((z) => Math.max(8, z - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink-600 shadow-soft hover:bg-ink-50" aria-label="Zoom out">
            <Minus className="h-4 w-4" />
          </button>
          <button onClick={() => setSatellite((s) => !s)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink-600 shadow-soft hover:bg-ink-50" aria-label="Toggle satellite view" aria-pressed={satellite}>
            <Layers className="h-4 w-4" />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink-600 shadow-soft hover:bg-ink-50" aria-label="Use my location">
            <Crosshair className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* search overlay */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 shadow-soft">
        <Search className="h-3.5 w-3.5 text-ink-400" />
        <input className="w-32 bg-transparent text-xs text-ink-700 placeholder:text-ink-400 focus:outline-none sm:w-44" placeholder="Search location…" aria-label="Search location" />
      </div>

      {draggableMarker && (
        <div className="absolute bottom-3 left-3 rounded-lg bg-white px-3 py-1.5 text-[11px] font-medium text-ink-600 shadow-soft">
          {dragPos.lat.toFixed(4)}, {dragPos.lng.toFixed(4)}
        </div>
      )}

      {/* legend */}
      {showLegend && (
        <div className="absolute bottom-3 right-3 max-w-[160px] rounded-lg bg-white/95 p-2.5 text-[10px] shadow-soft backdrop-blur">
          <p className="mb-1.5 font-semibold text-ink-700">Status Legend</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {Object.entries(statusConfig).slice(0, 8).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                <span className="text-ink-600">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
