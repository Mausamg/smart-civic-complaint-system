import { useEffect, useState } from 'react';
import {
    CircleMarker,
    MapContainer,
    TileLayer,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import {
    type LocationSearchMode,
    type LocationSearchResult,
    searchNepalLocations,
} from '@/services/locationService';
interface Coordinates {
    lat: number;
    lng: number;
}

interface MapTarget extends Coordinates {
    zoom: number;
}

interface CitizenLocationPickerProps {
    selectedLocation: Coordinates | null;
    onLocationSelect: (coordinates: Coordinates) => void;
    onLocationClear: () => void;
    accessToken: string | null | undefined;
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

function MapFlyTo({
                      target,
                  }: {
    target: MapTarget | null;
}) {
    const map = useMap();

    useEffect(() => {
        if (!target) return;

        map.flyTo(
            [target.lat, target.lng],
            target.zoom,
            {duration: 1.2}
        );
    }, [map, target]);

    return null;
}

export function CitizenLocationPicker({
                                          selectedLocation,
                                          onLocationSelect,
                                          onLocationClear,
                                          accessToken,
                                      }: CitizenLocationPickerProps) {
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<LocationSearchMode>('city');
    const [results, setResults] = useState<LocationSearchResult[]>([]);
    const [resultMode, setResultMode] =
        useState<LocationSearchMode>('city');
    const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
    const [focusedPlace, setFocusedPlace] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        if (isSearching) return;

        const searchText = query.trim();

        if (searchText.length < 3 || searchText.length > 120) {
            setError('Enter a location between 3 and 120 characters.');
            return;
        }

        if (!accessToken) {
            setError('Please sign in to search for locations.');
            return;
        }

        setIsSearching(true);
        setError(null);
        setResults([]);
        setFocusedPlace(null);

        try {
            const places = await searchNepalLocations(
                searchText,
                mode,
                accessToken
            );

            setResults(places);
            setResultMode(mode);

            if (places.length === 0) {
                setError('No matching locations found. Try another search.');
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Location search failed. Please try again.'
            );
        } finally {
            setIsSearching(false);
        }
    };

    const handleChoosePlace = (place: LocationSearchResult) => {
        setMapTarget({
            lat: place.latitude,
            lng: place.longitude,
            zoom: resultMode === 'city' ? 13 : 16,
        });

        setFocusedPlace(place.name);
        setResults([]);

        // Searching moves the map, but does not pin the incident.
        // Clear any old pin to avoid submitting an outdated location.
        onLocationClear();
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label
                    htmlFor="incident-location-search"
                    className="block text-sm font-medium text-ink-700 dark:text-ink-200"
                >
                    Search location in Nepal
                </label>

                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
                    <input
                        id="incident-location-search"
                        type="text"
                        value={query}
                        maxLength={120}
                        disabled={isSearching}
                        placeholder={
                            mode === 'city'
                                ? 'Search a city or town in Nepal'
                                : 'Search a street, landmark or place'
                        }
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setResults([]);
                            setError(null);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                void handleSearch();
                            }
                        }}
                        className="w-full min-w-0 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
                    />

                    <select
                        aria-label="Location search type"
                        value={mode}
                        disabled={isSearching}
                        onChange={(event) => {
                            setMode(event.target.value as LocationSearchMode);
                            setResults([]);
                            setError(null);
                        }}
                        className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
                    >
                        <option value="city">City / Town</option>
                        <option value="place">Specific place</option>
                    </select>

                    <button
                        type="button"
                        onClick={() => void handleSearch()}
                        disabled={isSearching}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSearching ? 'Searching...' : 'Search'}
                    </button>
                </div>

                <p className="text-xs text-ink-500">
                    Search to move the map. Then click the exact incident
                    location to place your pin.
                </p>

                {error && (
                    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                        {error}
                    </p>
                )}

                {results.length > 0 && (
                    <ul className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-ink-200 p-1 dark:border-ink-700">
                        {results.map((place, index) => (
                            <li key={`${place.latitude}-${place.longitude}-${index}`}>
                                <button
                                    type="button"
                                    onClick={() => handleChoosePlace(place)}
                                    className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
                                >
                                    {place.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {focusedPlace && (
                    <p role="status" className="text-sm text-blue-700 dark:text-blue-300">
                        Map moved to {focusedPlace}. Click the exact incident
                        location on the map to confirm your pin.
                    </p>
                )}
            </div>

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

                    <MapFlyTo target={mapTarget}/>

                    <LocationClickHandler
                        onLocationSelect={(coordinates) => {
                            setFocusedPlace(null);
                            onLocationSelect(coordinates);
                        }}
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
                Click anywhere on the map to select the exact incident
                location. Search results are approximate and do not
                automatically select a complaint location.
            </p>

            {selectedLocation ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink-700 dark:text-ink-200">
                        Selected coordinates:{' '}
                        {selectedLocation.lat.toFixed(6)},{' '}
                        {selectedLocation.lng.toFixed(6)}
                    </p>

                    <button
                        type="button"
                        onClick={onLocationClear}
                        className="text-sm text-red-600 hover:underline"
                    >
                        Clear pin
                    </button>
                </div>
            ) : (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                    No incident location selected yet.
                </p>
            )}

            <p className="text-xs text-ink-500">
                Location search powered by{' '}
                <a
                    href="https://www.geoapify.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                >
                    Geoapify
                </a>.
            </p>
        </div>
    );
}
