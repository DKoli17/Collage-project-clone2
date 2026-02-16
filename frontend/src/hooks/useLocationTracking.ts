import { useEffect, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

interface LocationData {
  latitude: number;
  longitude: number;
  locality?: string;
}

interface UseLocationTrackingOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  enableHighAccuracy?: boolean;
  onLocationUpdate?: (location: LocationData) => void;
  onError?: (error: string) => void;
}

export function useLocationTracking({
  enabled = false,
  interval = 30000, // Default: update every 30 seconds
  enableHighAccuracy = false,
  onLocationUpdate,
  onError,
}: UseLocationTrackingOptions = {}) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get reverse geocoding (locality name)
  const getLocalityName = useCallback(async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();
      return data.address?.city || data.address?.town || data.address?.village || '';
    } catch (err) {
      console.warn('Failed to get locality name:', err);
      return '';
    }
  }, []);

  // Update location to server
  const updateLocationToServer = useCallback(
    async (latitude: number, longitude: number, locality: string) => {
      try {
        // 1. Send via HTTP
        const token = localStorage.getItem('auth_token');
        if (token) {
          await fetch('http://localhost:5000/api/student/update-location', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ latitude, longitude, locality }),
          }).catch((err) => console.warn('HTTP location update failed:', err));
        }

        // 2. Send via WebSocket
        try {
          const userId = localStorage.getItem('user_id');
          if (userId) {
            const socket = io('http://localhost:5000', {
              reconnection: true,
              reconnectionDelay: 1000,
              reconnectionDelayMax: 5000,
              reconnectionAttempts: 5,
            });

            socket.on('connect', () => {
              socket.emit('student:send-location', {
                studentId: userId,
                latitude,
                longitude,
                locality,
              });
              socket.disconnect();
            });
          }
        } catch (err) {
          console.warn('WebSocket location update failed:', err);
        }
      } catch (err) {
        console.error('Error updating location:', err);
      }
    },
    []
  );

  // Handle location success
  const handleLocationSuccess = useCallback(
    async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      
      // Get locality name
      const locality = await getLocalityName(latitude, longitude);
      
      const newLocation: LocationData = {
        latitude: Math.round(latitude * 10000) / 10000,
        longitude: Math.round(longitude * 10000) / 10000,
        locality,
      };

      setLocation(newLocation);
      setError(null);
      onLocationUpdate?.(newLocation);

      // Send to server
      await updateLocationToServer(newLocation.latitude, newLocation.longitude, locality);
    },
    [getLocalityName, updateLocationToServer, onLocationUpdate]
  );

  // Handle location error
  const handleLocationError = useCallback(
    (err: GeolocationPositionError) => {
      let errorMessage = 'Failed to access location';
      
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorMessage = 'Location permission denied. Please enable location access in settings.';
          break;
        case err.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable.';
          break;
        case err.TIMEOUT:
          errorMessage = 'Location request timed out.';
          break;
      }

      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Geolocation error:', errorMessage);
    },
    [onError]
  );

  // Request location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser';
      setError(msg);
      onError?.(msg);
      return;
    }

    setIsTracking(true);
    navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, {
      enableHighAccuracy,
      timeout: 10000,
      maximumAge: 0,
    });
  }, [handleLocationSuccess, handleLocationError, enableHighAccuracy, onError]);

  // Start/stop tracking
  useEffect(() => {
    if (!enabled) {
      setIsTracking(false);
      return;
    }

    // Request initial location
    requestLocation();

    // Set up interval for periodic updates
    const intervalId = setInterval(() => {
      requestLocation();
    }, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, interval, requestLocation]);

  return {
    location,
    isTracking,
    error,
    requestLocation,
  };
}
