import { useState, useEffect } from 'react';
import { MapPin, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useLocationTracking } from '../hooks/useLocationTracking';

interface LocationPermissionPromptProps {
  onLocationEnabled?: (enabled: boolean) => void;
  autoEnable?: boolean;
}

export function LocationPermissionPrompt({
  onLocationEnabled,
  autoEnable = false,
}: LocationPermissionPromptProps) {
  const [showPrompt, setShowPrompt] = useState(!autoEnable);
  const [isGranted, setIsGranted] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const { location, isTracking, error, requestLocation } = useLocationTracking({
    enabled: isGranted,
    interval: 60000, // Update every minute
    enableHighAccuracy: true,
  });

  useEffect(() => {
    if (autoEnable) {
      enableLocation();
    }
  }, [autoEnable]);

  const enableLocation = async () => {
    setIsRequesting(true);
    try {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        setIsRequesting(false);
        return;
      }

      setIsGranted(true);
      requestLocation();
      setShowPrompt(false);
      onLocationEnabled?.(true);

      // Store preference
      localStorage.setItem('location_tracking_enabled', 'true');
    } catch (err) {
      console.error('Error enabling location:', err);
      alert('Failed to enable location tracking');
    } finally {
      setIsRequesting(false);
    }
  };

  const disableLocation = () => {
    setIsGranted(false);
    setShowPrompt(false);
    onLocationEnabled?.(false);
    localStorage.setItem('location_tracking_enabled', 'false');
  };

  if (!showPrompt && !isGranted) {
    return null;
  }

  // If tracking is active, show minimal status
  if (isGranted && !showPrompt) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className={`rounded-lg shadow-lg p-3 flex items-center gap-3 ${
          isTracking
            ? 'bg-green-50 border border-green-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          {isTracking ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">Location tracking active</span>
              </div>
              {location && (
                <span className="text-xs text-green-600">
                  {location.locality || `${location.latitude.toFixed(3)}°, ${location.longitude.toFixed(3)}°`}
                </span>
              )}
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-xs font-medium text-blue-700">Updating location...</span>
            </>
          )}
          <button
            onClick={() => setShowPrompt(true)}
            className="text-xs text-gray-500 hover:text-gray-700 ml-auto"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Prompt to enable/disable location
  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-bold text-gray-900 text-lg">Location Sharing</h3>
              <p className="text-xs text-gray-600 mt-1">
                Enable location sharing so other students and admins can see your location on the map in real-time
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-2 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Real-time location updates</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Helps find nearby campuses</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Privacy controlled with browser permissions</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={disableLocation}
              variant="outline"
              className="flex-1"
              disabled={isRequesting}
            >
              Not Now
            </Button>
            <Button
              onClick={enableLocation}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isRequesting}
            >
              {isRequesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Enable Location
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
