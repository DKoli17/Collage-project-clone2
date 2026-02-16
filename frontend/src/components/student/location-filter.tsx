import { MapPin, Navigation, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface LocationFilterProps {
  onLocationSearch?: (latitude: number, longitude: number, radius: number) => void;
  onClearLocation?: () => void;
  isLoading?: boolean;
  currentLocation?: { lat: number; lng: number } | null;
}

export function LocationFilter({
  onLocationSearch,
  onClearLocation,
  isLoading = false,
  currentLocation,
}: LocationFilterProps) {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('10');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isLocationActive, setIsLocationActive] = useState(false);

  useEffect(() => {
    if (currentLocation) {
      setLatitude(currentLocation.lat.toString());
      setLongitude(currentLocation.lng.toString());
    }
  }, [currentLocation]);

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat.toString());
        setLongitude(lng.toString());
        setIsGettingLocation(false);
        setIsLocationActive(true);

        // Automatically search when location is obtained
        if (onLocationSearch) {
          onLocationSearch(lat, lng, parseFloat(radius));
        }
      },
      (error) => {
        let errorMessage = 'Failed to get your location';
        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'Location permission denied. Please enable location access in browser settings.';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'Location information is unavailable.';
            break;
          case 3: // TIMEOUT
            errorMessage = 'Location request timed out.';
            break;
        }
        setLocationError(errorMessage);
        setIsGettingLocation(false);
      }
    );
  };

  const handleClear = () => {
    setLatitude('');
    setLongitude('');
    setRadius('10');
    setLocationError(null);
    setIsLocationActive(false);
    onClearLocation?.();
  };

  const handleRadiusChange = (newRadius: string) => {
    setRadius(newRadius);
    // Auto-search with new radius if location is active
    if (isLocationActive && latitude && longitude) {
      onLocationSearch?.(parseFloat(latitude), parseFloat(longitude), parseFloat(newRadius));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-900">Find Vendors Near You</h3>
        </div>

        {/* Current Location Button */}
        <button
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation || isLoading}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Navigation className="w-4 h-4" />
          {isGettingLocation ? 'Getting Your Location...' : 'Use My Current Location'}
        </button>

        {/* Error Message */}
        {locationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{locationError}</p>
          </div>
        )}

        {/* Location Active Info */}
        {isLocationActive && latitude && longitude && (
          <>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-900 mb-2">
                    ✓ Location Detected
                  </p>
                  <p className="text-xs text-green-700">
                    Latitude: <span className="font-mono font-semibold">{parseFloat(latitude).toFixed(6)}</span>
                  </p>
                  <p className="text-xs text-green-700">
                    Longitude: <span className="font-mono font-semibold">{parseFloat(longitude).toFixed(6)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Radius Slider */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold text-gray-700">
                  Search Radius
                </label>
                <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{radius} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={radius}
                onChange={(e) => handleRadiusChange(e.target.value)}
                disabled={isLoading}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>1 km</span>
                <span>50 km</span>
              </div>
            </div>

            {/* Clear Button */}
            <button
              onClick={handleClear}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              Clear Location & Search
            </button>
          </>
        )}

        {/* Info Box */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800">
            📍 <span className="font-semibold">Real-time location:</span> Click the button above to detect your current location automatically. Adjust the radius to find vendors within your preferred distance.
          </p>
        </div>
      </div>
    </div>
  );
}
