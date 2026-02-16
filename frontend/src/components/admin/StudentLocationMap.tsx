import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface StudentLocation {
  _id: string;
  name: string;
  email: string;
  latitude: number;
  longitude: number;
  locality: string;
  city?: string;
  state?: string;
}

interface StudentLocationMapProps {
  students: StudentLocation[];
  center?: [number, number];
  zoom?: number;
  isLoading?: boolean;
  onStudentClick?: (student: StudentLocation) => void;
}

const defaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export function StudentLocationMap(
  {
    students,
    center = [20.5937, 78.9629], // Default to India center
    zoom = 5,
    isLoading = false,
    onStudentClick,
  }: StudentLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Map<string, L.Marker>>(new Map());
  const { toast } = useToast();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = L.map(mapContainer.current).setView(center as L.LatLngExpression, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map.current);

      console.log('✅ Map initialized');
    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        title: 'Map Error',
        description: 'Failed to initialize map',
        variant: 'destructive',
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when students change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach((marker) => {
      map.current?.removeLayer(marker);
    });
    markers.current.clear();

    // Add new markers
    students.forEach((student) => {
      if (student.latitude && student.longitude) {
        try {
          const marker = L.marker([student.latitude, student.longitude], {
            icon: defaultIcon,
          });

          const popupContent = `
            <div class="popup-content" style="font-family: system-ui; font-size: 12px; width: 200px;">
              <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${student.name}</div>
              <div style="color: #666; margin-bottom: 4px;">📧 ${student.email}</div>
              <div style="color: #666; margin-bottom: 4px;">📍 ${student.locality || 'Location not specified'}</div>
              ${student.city ? `<div style="color: #666; margin-bottom: 4px;">🏙️ ${student.city}</div>` : ''}
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                <div style="color: #0066cc; font-size: 11px;">
                  ${student.latitude.toFixed(4)}, ${student.longitude.toFixed(4)}
                </div>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.on('click', () => {
            onStudentClick?.(student);
          });

          marker.addTo(map.current!);
          markers.current.set(student._id, marker);
        } catch (error) {
          console.error(`Error adding marker for student ${student._id}:`, error);
        }
      }
    });

    // Fit bounds if students have locations
    const validStudents = students.filter((s) => s.latitude && s.longitude);
    if (validStudents.length > 0 && map.current) {
      try {
        const bounds = L.latLngBounds(
          validStudents.map((s) => [s.latitude, s.longitude] as L.LatLngTuple)
        );
        if (bounds.isValid()) {
          map.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }

    console.log(`📍 Updated ${students.length} markers on map`);
  }, [students, onStudentClick]);

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50 rounded-lg">
          <div className="bg-white rounded-lg p-4 flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Loading locations...</span>
          </div>
        </div>
      )}

      {students.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-40">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">No student locations yet</p>
            <p className="text-gray-400 text-sm">Students will appear here when they share their location</p>
          </div>
        </div>
      )}

      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ minHeight: '500px' }}
      />

      {/* Info overlay */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 text-sm z-40">
        <div className="font-semibold text-gray-800 mb-1">📍 Active Locations</div>
        <div className="text-gray-600">
          {students.length} student{students.length !== 1 ? 's' : ''} tracking their location
        </div>
      </div>
    </div>
  );
}
