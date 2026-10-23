
import {
    CircleMarker,
    MapContainer,
    TileLayer,
    useMapEvents,
} from 'react-leaflet';

interface Coordinates {
    lat: number;
    lng: number;
}

interface CitizenLocationPickerProps {
    selectedLocation: Coordinates | null;
    onLocationSelect: (coordinates: Coordinates) => void;
}

const DEFAULT_CENTER: [number, number] = [27.7172, 85.3249];

function LocationClickHandler({
                                  onLocationSelect,
                              }: {
    onLocationSelect: (coordinates: Coordinates) => void;
}) {
    useMapEvents({
        click(event) {
            onLocationSelect({
                lat: event.latlng.lat,
                lng: event.latlng.lng,
            });
        },
    });

    return null;
}

export function CitizenLocationPicker({
                                          selectedLocation,
                                          onLocationSelect,
                                      }: CitizenLocationPickerProps) {
    return (
        <div className="space-y-2">
            <div className="overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-700">
                <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={13}
                    scrollWheelZoom={true}
                    className="h-72 w-full"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <LocationClickHandler
                        onLocationSelect={onLocationSelect}
                    />

                    {selectedLocation && (
                        <CircleMarker
                            center={[
                                selectedLocation.lat,
                                selectedLocation.lng,
                            ]}
                            radius={9}
                            pathOptions={{
                                color: '#ffffff',
                                weight: 3,
                                fillColor: '#2563eb',
                                fillOpacity: 1,
                            }}
                        />
                    )}
                </MapContainer>
            </div>

            <p className="text-xs text-ink-500">
                Click anywhere on the map to select the incident location.
            </p>

            {selectedLocation ? (
                <p className="text-sm font-medium text-ink-700 dark:text-ink-200">
                    Selected coordinates:{' '}
                    {selectedLocation.lat.toFixed(6)},{' '}
                    {selectedLocation.lng.toFixed(6)}
                </p>
            ) : (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                    No incident location selected yet.
                </p>
            )}
        </div>
    );
}
