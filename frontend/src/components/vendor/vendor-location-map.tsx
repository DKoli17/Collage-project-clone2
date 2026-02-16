import { useEffect, useRef, useState } from 'react'
import { Navigation, Loader2, Store } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import L, { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface LocationData {
  latitude: number
  longitude: number
  locality?: string
  city?: string
  state?: string
  accuracy?: number
}

interface VendorLocationMapProps {
  vendorData?: any
}

export function VendorLocationMap({ vendorData }: VendorLocationMapProps) {
  const mapRef = useRef<LeafletMap | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const watchIdRef = useRef<number | null>(null)

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Default location (center of India)
    const defaultLat = vendorData?.latitude || 20.5937
    const defaultLng = vendorData?.longitude || 78.9629

    try {
      // Create map
      const map = L.map(containerRef.current).setView([defaultLat, defaultLng], 13)

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map

      // If vendor has location data, show it
      if (vendorData?.latitude && vendorData?.longitude) {
        setLocation({
          latitude: vendorData.latitude,
          longitude: vendorData.longitude,
          locality: vendorData.locality,
          city: vendorData.city,
          state: vendorData.state,
        })
        addMarker(map, vendorData.latitude, vendorData.longitude)
        setLoading(false)
      }
    } catch (err) {
      console.error('Error initializing map:', err)
      setError('Failed to initialize map')
      setLoading(false)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [vendorData])

  const addMarker = (map: LeafletMap, lat: number, lng: number) => {
    if (markerRef.current) {
      markerRef.current.remove()
    }

    const customIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    })

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map)
    marker.bindPopup(
      `<div class="text-sm">
        <p class="font-bold">🏪 Store Location</p>
        <p>Lat: ${lat.toFixed(4)}</p>
        <p>Lng: ${lng.toFixed(4)}</p>
      </div>`
    )
    marker.openPopup()

    markerRef.current = marker
    map.setView([lat, lng], 15)
  }

  const startTracking = () => {
    setIsTracking(true)
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setIsTracking(false)
      return
    }

    // First, get one position
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords

        try {
          // Update location state
          setLocation({
            latitude,
            longitude,
            accuracy,
          })

          // Add or update marker on map
          if (mapRef.current) {
            addMarker(mapRef.current, latitude, longitude)
          }

          // Send location to backend
          await updateLocationOnBackend(latitude, longitude, accuracy)

          // Get location details (city, locality) using reverse geocoding
          await getLocationDetails(latitude, longitude)

          setLoading(false)
        } catch (err) {
          console.error('Error processing location:', err)
          setError('Failed to process location')
          setLoading(false)
        }
      },
      (err) => {
        console.error('Geolocation error:', err)
        setError(`Error: ${err.message}`)
        setIsTracking(false)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )

    // Watch position for continuous tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords

        setLocation((prev) => ({
          ...prev,
          latitude,
          longitude,
          accuracy,
        }))

        if (mapRef.current) {
          addMarker(mapRef.current, latitude, longitude)
        }

        // Send location update to backend
        await updateLocationOnBackend(latitude, longitude, accuracy)
      },
      (err) => console.error('Watch position error:', err),
      {
        enableHighAccuracy: true,
        maximumAge: 5000, // Update every 5 seconds
      }
    )
  }

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
  }

  const updateLocationOnBackend = async (latitude: number, longitude: number, accuracy?: number) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) return

      const response = await fetch('http://localhost:5000/api/vendor/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          accuracy,
        }),
      })

      if (!response.ok) {
        console.error('Failed to update location on backend')
      }
    } catch (err) {
      console.error('Error updating location on backend:', err)
    }
  }

  const getLocationDetails = async (latitude: number, longitude: number) => {
    try {
      // Using Open Street Map Nominatim API for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      )

      if (!response.ok) throw new Error('Failed to fetch location details')

      const data = await response.json()

      setLocation((prev) => {
        if (!prev) return prev
        
        return {
          latitude: prev.latitude,
          longitude: prev.longitude,
          accuracy: prev.accuracy,
          locality: (data.address?.village || data.address?.town || data.address?.neighborhood || data.address?.city || 'Unknown') as string,
          city: (data.address?.city || data.address?.county || data.address?.municipality || 'Unknown') as string,
          state: (data.address?.state || data.address?.province || 'Unknown') as string,
        }
      })
    } catch (err) {
      console.error('Error getting location details:', err)
      // Continue without location details
    }
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-red-600" />
              Store Location
            </CardTitle>
            <CardDescription>Your store's GPS location visible to nearby students</CardDescription>
          </div>
          <button
            onClick={isTracking ? stopTracking : startTracking}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isTracking
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Navigation className="w-4 h-4" />
            {loading ? 'Locating...' : isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
            {error}
          </div>
        )}

        {loading && !error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Getting store location...</p>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div
          ref={containerRef}
          className="w-full h-96 rounded-lg border border-gray-200 bg-gray-50"
          style={{ minHeight: '400px' }}
        />

        {/* Location Details */}
        {location && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50 rounded-lg p-4 border border-red-200">
            <div>
              <p className="text-sm font-semibold text-gray-700">Latitude</p>
              <p className="text-lg font-mono text-red-600">{location.latitude.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Longitude</p>
              <p className="text-lg font-mono text-red-600">{location.longitude.toFixed(6)}</p>
            </div>
            {location.accuracy && (
              <div>
                <p className="text-sm font-semibold text-gray-700">Accuracy</p>
                <p className="text-lg font-mono text-red-600">±{location.accuracy.toFixed(0)}m</p>
              </div>
            )}
            {location.locality && (
              <div>
                <p className="text-sm font-semibold text-gray-700">Locality</p>
                <p className="text-lg font-mono text-red-600">{location.locality}</p>
              </div>
            )}
            {location.city && (
              <div>
                <p className="text-sm font-semibold text-gray-700">City</p>
                <p className="text-lg font-mono text-red-600">{location.city}</p>
              </div>
            )}
            {location.state && (
              <div>
                <p className="text-sm font-semibold text-gray-700">State</p>
                <p className="text-lg font-mono text-red-600">{location.state}</p>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">📍 Note:</span> Your store location will be shared with students to show nearby vendors offering discounts. This helps students find you faster!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
