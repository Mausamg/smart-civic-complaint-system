import { useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from 'react-leaflet';

interface Props {
  latitude: number | null;
  longitude: number | null;
}

export function CitizenIncidentLocationMap({
  latitude,
  longitude,
}: Props) {
  const mapRef = useRef<LeafletMap | null>(null);

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const position: [number, number] = [
    latitude,
    longitude,
  ];

  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-100">
        Your reported location on the map
      </h3>

      <p className="mt-1 text-xs text-ink-500">
        This is the exact location you selected when reporting
        the complaint. Viewing it here does not enable public
        map sharing.
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-ink-200 dark:border-ink-700">
        <MapContainer
          key={`${latitude},${longitude}`}
          ref={mapRef}
          center={position}
          zoom={17}
          zoomControl={true}
          scrollWheelZoom={true}
          dragging={true}
          doubleClickZoom={true}
          touchZoom={true}
          className="h-[360px] w-full md:h-[450px]"
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
            <Popup>
              Your reported incident location
            </Popup>
          </CircleMarker>
        </MapContainer>
      </div>

      <button
        type="button"
        onClick={() => mapRef.current?.setView(position, 17)}
        className="mt-3 text-sm font-semibold text-primary-600 hover:underline"
      >
        Reset to incident location
      </button>
    </div>
  );
}
