import { MapPin, Navigation, X, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { updateStudentLocation, getStudentLocation } from '../../lib/studentAPI';

interface StudentLocationShareProps {
  onLocationUpdated?: (location: { latitude: number; longitude: number }) => void;
  isLoading?: boolean;
}

export function StudentLocationShare({
  onLocationUpdated,
  isLoading = false,
}: StudentLocationShareProps) {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  
  const [locationError, setLocationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocationShared, setIsLocationShared] = useState(false);

  // Load existing location on mount
  useEffect(() => {
    loadExistingLocation();
  }, []);

  const loadExistingLocation = async () => {
    try {
      const result = await getStudentLocation();
      if (result.data) {
        const { latitude: lat, longitude: lon, locality: loc, city: c, state: s, postalCode: pc } = result.data;
        if (lat && lon) {
          setLatitude(lat.toString());
          setLongitude(lon.toString());
          setLocality(loc || '');
          setCity(c || '');
          setState(s || '');
          setPostalCode(pc || '');
          setIsLocationShared(true);
        }
      }
    } catch (error) {
      console.error('Error loading location:', error);
    }
  };

  const handleGetCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setLatitude(lat.toString());
        setLongitude(lng.toString());
        setIsGettingLocation(false);

        // Try to get location details (reverse geocoding would need external API)
        // For now, just show the coordinates
        setLocationError(null);
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

  const handleSaveLocation = async () => {
    try {
      if (!latitude || !longitude) {
        setLocationError('Please provide latitude and longitude');
        return;
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setLocationError('Invalid coordinates');
        return;
      }

      setIsSaving(true);
      setLocationError(null);

      const result = await updateStudentLocation(lat, lng, locality, postalCode, city, state);

      if (result.success) {
        setSuccessMessage('✓ Location shared successfully! Vendors can now find you nearby.');
        setIsLocationShared(true);
        onLocationUpdated?.({ latitude: lat, longitude: lng });
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error: any) {
      setLocationError(error.message || 'Failed to save location');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setLatitude('');
    setLongitude('');
    setLocality('');
    setCity('');
    setState('');
    setPostalCode('');
    setLocationError(null);
    setSuccessMessage(null);
    setIsLocationShared(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-gray-900">Share Your Location</h3>
          <span className="text-xs text-gray-500 ml-auto">Vendors can find you nearby</span>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {locationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{locationError}</p>
          </div>
        )}

        {/* Get Current Location Button */}
        <button
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation || isSaving || isLoading}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Navigation className="w-4 h-4" />
          {isGettingLocation ? 'Detecting Location...' : 'Use My Current Location'}
        </button>

        {/* Location Coordinates */}
        {(latitude || longitude) && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs font-semibold text-purple-900 mb-1">Latitude</p>
                <input
                  type="number"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  step="0.0001"
                  min="-90"
                  max="90"
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-900 mb-1">Longitude</p>
                <input
                  type="number"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  step="0.0001"
                  min="-180"
                  max="180"
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Location Details */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-purple-900 mb-1 block">Locality / Area</label>
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g., Bandra West"
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-purple-900 mb-1 block">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g., Mumbai"
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-purple-900 mb-1 block">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g., Maharashtra"
                    className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-purple-900 mb-1 block">Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g., 400050"
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Status Badge */}
        {isLocationShared && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700">Location is shared with vendors</span>
          </div>
        )}

        {/* Action Buttons */}
        {(latitude || longitude) && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSaveLocation}
              disabled={isSaving || isLoading || isGettingLocation}
              className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Share Location
                </>
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={isSaving || isLoading}
              className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800">
            <span className="font-semibold">💡 Why share location?</span> Vendors can discover you're nearby and notify you about special discounts and new coupons they're offering in your area.
          </p>
        </div>
      </div>
    </div>
  );
}
