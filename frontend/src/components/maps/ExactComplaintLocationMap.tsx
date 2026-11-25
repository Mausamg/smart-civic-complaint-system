import { useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';

import { Card } from '@/components/ui/Card';

interface ExactComplaintLocationMapProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
}

export function ExactComplaintLocationMap({
  latitude,
  longitude,
  address,
}: ExactComplaintLocationMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);

  const hasValidCoordinates =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (!hasValidCoordinates) {
    return (
      <Card className="p-5">
        <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
          Exact complaint location
        </h2>
        <p className="mt-2 text-sm text-ink-500">
          No valid GPS coordinates are available for this complaint.
        </p>
        <p className="mt-2 text-sm text-ink-700 dark:text-ink-200">
          Address: {address || 'Not specified'}
        </p>
      </Card>
    );
  }

  const position: [number, number] = [latitude, longitude];

  const googleMapsUrl =
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(`${latitude},${longitude}`);

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-ink-900 dark:text-ink-100">
        Exact complaint location
      </h2>

      <p className="mt-1 text-sm text-ink-500">
        Precise location for users authorized to view this complaint.
        Public map consent does not affect this private view.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs text-ink-500">Latitude</p>
          <p className="font-mono text-sm font-semibold">
            {latitude.toFixed(6)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-500">Longitude</p>
          <p className="font-mono text-sm font-semibold">
            {longitude.toFixed(6)}
          </p>
        </div>
      </div>

      <p className="mt-3 break-words text-sm text-ink-700 dark:text-ink-200">
        <strong>Reported address:</strong> {address || 'Not specified'}
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-ink-200 dark:border-ink-700">
        <MapContainer
          ref={mapRef}
          key={`${latitude},${longitude}`}
          center={position}
          zoom={17}
          zoomControl={true}
          scrollWheelZoom={true}
          dragging={true}
          doubleClickZoom={true}
          touchZoom={true}
          boxZoom={true}
          keyboard={true}
          className="h-[420px] w-full md:h-[560px]"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <CircleMarker
            center={position}
            radius={10}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#2563eb',
              fillOpacity: 1,
            }}
          >
            <Popup>Exact reported incident location</Popup>
          </CircleMarker>
        </MapContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-500">
          GPS pin from the original complaint, not rounded public map coordinates.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => mapRef.current?.setView(position, 17)}
            className="text-sm font-semibold text-primary-600 hover:underline"
          >
            Reset to incident
          </button>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-primary-600 hover:underline"
          >
            Open in Google Maps
          </a>
        </div>
      </div>
    </Card>
  );
}
