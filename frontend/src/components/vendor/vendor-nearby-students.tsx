import { MapPin, Users, Phone, Mail, MapPinIcon } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Student {
  _id: string;
  name: string;
  email: string;
  mobileNumber?: string;
  latitude: number;
  longitude: number;
  locality?: string;
  city?: string;
  state?: string;
  collegeName?: string;
  enrollmentNumber?: string;
  distance?: string;
}

interface VendorNearbyStudentsProps {
  students: Student[];
  vendorLocation?: {
    latitude: number;
    longitude: number;
    businessAddress?: string;
    city?: string;
    state?: string;
  };
  isLoading?: boolean;
  onSelectStudent?: (student: Student) => void;
}

export function VendorNearbyStudents({
  students,
  vendorLocation,
  isLoading = false,
  onSelectStudent,
}: VendorNearbyStudentsProps) {
  const [sortedStudents, setSortedStudents] = useState<Student[]>(students);
  const [sortBy, setSortBy] = useState<'distance' | 'name'>('distance');

  // Check if student is in same city as vendor
  const isSameLocation = (studentCity?: string): boolean => {
    if (!studentCity || !vendorLocation?.city) return false;
    return studentCity.toLowerCase().trim() === vendorLocation.city.toLowerCase().trim();
  };

  useEffect(() => {
    let sorted = [...students];
    if (sortBy === 'distance') {
      sorted.sort((a, b) => parseFloat(a.distance || '999') - parseFloat(b.distance || '999'));
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    setSortedStudents(sorted);
  }, [students, sortBy]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-8 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-semibold">No students nearby</p>
        <p className="text-sm text-gray-500 mt-2">
          Students who share their location in your area will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Vendor Location */}
      {vendorLocation && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">Your Store Location</p>
              <p className="text-xs text-blue-700">
                {vendorLocation.businessAddress || `${vendorLocation.city}, ${vendorLocation.state}`}
              </p>
              <p className="text-xs text-blue-600 mt-1 font-mono">
                ({vendorLocation.latitude.toFixed(4)}, {vendorLocation.longitude.toFixed(4)})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setSortBy('distance')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            sortBy === 'distance'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📍 By Distance
        </button>
        <button
          onClick={() => setSortBy('name')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            sortBy === 'name'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          👤 By Name
        </button>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedStudents.map((student) => (
          <div
            key={student._id}
            onClick={() => onSelectStudent?.(student)}
            className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer p-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-sm mb-1">{student.name}</h4>
                <p className="text-xs text-gray-600">{student.collegeName || 'College not specified'}</p>
                {isSameLocation(student.city) && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                    📍 Same Location
                  </span>
                )}
              </div>
              {student.distance && (
                <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                  {student.distance} km
                </div>
              )}
            </div>

            {/* Location Info */}
            {(student.locality || student.city) && (
              <div className="flex items-start gap-2 mb-3 p-3 bg-blue-50 rounded-lg">
                <MapPinIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 line-clamp-2">
                  {student.locality && <span>{student.locality}</span>}
                  {student.city && <span>{student.city}</span>}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              {student.email && (
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a
                    href={`mailto:${student.email}`}
                    className="text-blue-600 hover:text-blue-700 break-all"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {student.email}
                  </a>
                </div>
              )}
              {student.mobileNumber && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <a
                    href={`tel:${student.mobileNumber}`}
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {student.mobileNumber}
                  </a>
                </div>
              )}
            </div>

            {/* Student Info */}
            {student.enrollmentNumber && (
              <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
                <span className="font-semibold">Enrollment:</span> {student.enrollmentNumber}
              </div>
            )}

            {/* Coordinates */}
            <div className="text-xs text-gray-500 mt-3 p-2 border-t border-gray-100 font-mono">
              ({student.latitude.toFixed(4)}, {student.longitude.toFixed(4)})
            </div>

            {/* Action Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectStudent?.(student);
              }}
              className="w-full mt-3 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-semibold text-sm transition-all"
            >
              Send Offer
            </button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-6">
        <p className="text-sm font-semibold text-green-900">
          📊 Found <span className="text-lg">{students.length}</span> student(s) nearby
        </p>
        <p className="text-xs text-green-700 mt-1">
          ✓ These students have shared their location and are approved to claim coupons
        </p>
      </div>
    </div>
  );
}
