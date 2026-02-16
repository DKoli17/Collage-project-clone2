import { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { getHeaders, API_BASE_URL } from '../../lib/api';

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  locality?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  accuracy?: number;
  lastUpdated?: string;
}

interface VendorLiveLocationProps {
  isEditing?: boolean;
}

export function VendorLiveLocation({ isEditing = false }: VendorLiveLocationProps) {
  const [location, setLocation] = useState<LocationData>({
    latitude: null,
    longitude: null,
    locality: '',
    city: '',
    state: '',
    postalCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  // Fetch vendor's current location on mount
  useEffect(() => {
    fetchVendorLocation();
  }, []);

  const fetchVendorLocation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendor/profile`, {
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch location');

      const data = await response.json();
      if (data.success && data.data) {
        setLocation({
          latitude: data.data.latitude || null,
          longitude: data.data.longitude || null,
          locality: data.data.locality || '',
          city: data.data.city || '',
          state: data.data.state || '',
          postalCode: data.data.postalCode || '',
          lastUpdated: data.data.updatedAt || new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error('Error fetching location:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      setGeoLoading(true);
      setError(null);
      setSuccess(false);

      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          // Fetch reverse geocoding info (optional, can be used with a geocoding API)
          const newLocation: LocationData = {
            latitude,
            longitude,
            accuracy,
            lastUpdated: new Date().toISOString(),
            locality: location.locality,
            city: location.city,
            state: location.state,
            postalCode: location.postalCode,
          };

          setLocation(newLocation);

          // Save to backend
          await saveLocationToBackend(latitude, longitude);
        },
        (error) => {
          const errorMessages: { [key: number]: string } = {
            1: 'Location permission denied. Please enable location access in your browser settings.',
            2: 'Unable to retrieve your location. Please try again.',
            3: 'Location request timed out. Please try again.',
          };

          const errorMsg = errorMessages[error.code] || 'An error occurred while getting your location';
          setError(errorMsg);
          toast({
            title: 'Location Error',
            description: errorMsg,
            variant: 'destructive',
          });
          setGeoLoading(false);
        },
        {
          timeout: 10000,
          enableHighAccuracy: true,
        }
      );
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
      setGeoLoading(false);
    }
  };

  const saveLocationToBackend = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/vendor/profile/update`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          latitude,
          longitude,
          locality: location.locality,
          city: location.city,
          state: location.state,
          postalCode: location.postalCode,
        }),
      });

      if (!response.ok) throw new Error('Failed to save location');

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setLocation((prev) => ({
          ...prev,
          latitude,
          longitude,
          lastUpdated: new Date().toISOString(),
        }));

        toast({
          title: 'Success',
          description: 'Location updated successfully',
          variant: 'default',
        });

        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setGeoLoading(false);
    }
  };

  const handleInputChange = (field: keyof LocationData, value: string | number) => {
    setLocation((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveLocation = async () => {
    try {
      if (!location.latitude || !location.longitude) {
        setError('Please get your location first');
        return;
      }

      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/vendor/profile/update`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          locality: location.locality,
          city: location.city,
          state: location.state,
          postalCode: location.postalCode,
        }),
      });

      if (!response.ok) throw new Error('Failed to save location');

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setError(null);
        toast({
          title: 'Success',
          description: 'Location details saved successfully',
          variant: 'default',
        });
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openOnMap = () => {
    if (location.latitude && location.longitude) {
      const mapsUrl = `https://www.google.com/maps/?q=${location.latitude},${location.longitude}`;
      window.open(mapsUrl, '_blank');
    }
  };

  if (loading && !location.latitude) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 hover:shadow-md transition-all">
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-blue-600" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 hover:shadow-md transition-all space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MapPin className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-gray-900">Live Location</h2>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <CheckCircle2 className="text-green-600 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium text-green-800">Location updated successfully!</p>
          </div>
        </div>
      )}

      {/* Current Location Display */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 font-semibold">LATITUDE</p>
              <p className="text-lg font-bold text-gray-900">
                {location.latitude ? location.latitude.toFixed(6) : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">LONGITUDE</p>
              <p className="text-lg font-bold text-gray-900">
                {location.longitude ? location.longitude.toFixed(6) : 'Not set'}
              </p>
            </div>
          </div>

          {location.accuracy && (
            <div>
              <p className="text-xs text-gray-600 font-semibold">ACCURACY</p>
              <p className="text-sm text-gray-700">±{Math.round(location.accuracy)} meters</p>
            </div>
          )}

          {location.lastUpdated && (
            <div>
              <p className="text-xs text-gray-600 font-semibold">LAST UPDATED</p>
              <p className="text-sm text-gray-700">
                {new Date(location.lastUpdated).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Get Current Location Button */}
      <button
        onClick={handleGetCurrentLocation}
        disabled={geoLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition"
      >
        {geoLoading ? (
          <>
            <Loader className="animate-spin" size={18} />
            Getting Location...
          </>
        ) : (
          <>
            <Navigation size={18} />
            Get Current Location
          </>
        )}
      </button>

      {/* Location Details (Editable) */}
      {isEditing && (
        <>
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold text-gray-900">Location Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Locality
                </label>
                <input
                  type="text"
                  value={location.locality || ''}
                  onChange={(e) => handleInputChange('locality', e.target.value)}
                  placeholder="e.g., Downtown, Market Area"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={location.postalCode || ''}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  placeholder="e.g., 110001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Save Location Details Button */}
            <button
              onClick={handleSaveLocation}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition"
            >
              {loading ? 'Saving...' : 'Save Location Details'}
            </button>
          </div>
        </>
      )}

      {/* View on Map Button */}
      {location.latitude && location.longitude && (
        <button
          onClick={openOnMap}
          className="w-full px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-bold transition border border-green-300"
        >
          📍 View on Google Maps
        </button>
      )}

      {/* Location Status Card */}
      {location.latitude && location.longitude && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold text-gray-900">Location Active</p>
              <p className="text-sm text-gray-600">
                Your vendor location is visible to students searching for nearby discounts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Location Alert */}
      {!location.latitude || !location.longitude ? (
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-yellow-800">
            📍 <strong>No location set yet.</strong> Click "Get Current Location" to enable location-based discovery for students.
          </p>
        </div>
      ) : null}
    </div>
  );
}
