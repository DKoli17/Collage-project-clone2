import { MapPin, Phone, Mail, Globe, X, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface VendorLocationData {
  name?: string;
  businessName?: string;
  businessType?: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  locality?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  businessEmail?: string;
  mobileNumber?: string;
  website?: string;
  businessDescription?: string;
  businessLogo?: string;
}

interface VendorLocationModalProps {
  isOpen: boolean;
  vendor: VendorLocationData | null;
  onClose: () => void;
}

export function VendorLocationModal({ isOpen, vendor, onClose }: VendorLocationModalProps) {
  if (!isOpen || !vendor) return null;

  const handleOpenMap = () => {
    if (vendor.latitude && vendor.longitude) {
      const mapsUrl = `https://maps.google.com/?q=${vendor.latitude},${vendor.longitude}`;
      window.open(mapsUrl, '_blank');
    }
  };

  const handleDirections = () => {
    if (vendor.latitude && vendor.longitude) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${vendor.latitude},${vendor.longitude}`;
      window.open(mapsUrl, '_blank');
    }
  };

  const fullAddress = vendor.businessAddress 
    ? `${vendor.businessAddress}, ${vendor.locality || vendor.city}, ${vendor.state} ${vendor.postalCode || ''}`
    : `${vendor.locality || vendor.city}, ${vendor.state} ${vendor.postalCode || ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h2 className="text-white font-bold text-xl">{vendor.businessName || vendor.name}</h2>
            {vendor.businessType && (
              <p className="text-blue-100 text-sm mt-1">{vendor.businessType}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Vendor Logo */}
          {vendor.businessLogo && (
            <div className="flex justify-center">
              <img
                src={vendor.businessLogo}
                alt={vendor.businessName || vendor.name}
                className="w-20 h-20 object-contain rounds-lg"
              />
            </div>
          )}

          {/* Business Description */}
          {vendor.businessDescription && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">{vendor.businessDescription}</p>
            </div>
          )}

          {/* Location Information */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Location
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-900 font-semibold mb-2">Address</p>
                <p className="text-sm text-gray-700 leading-relaxed">{fullAddress}</p>
                {vendor.latitude && vendor.longitude && (
                  <p className="text-xs text-gray-600 mt-2">
                    Coordinates: {vendor.latitude.toFixed(4)}, {vendor.longitude.toFixed(4)}
                  </p>
                )}
              </div>

              {vendor.latitude && vendor.longitude && (
                <>
                  <button
                    onClick={handleOpenMap}
                    className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    View on Map
                  </button>
                  <button
                    onClick={handleDirections}
                    className="w-full px-4 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Get Directions
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900">Contact Information</h3>
            <div className="space-y-3">
              {vendor.mobileNumber && (
                <a
                  href={`tel:${vendor.mobileNumber}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <Phone className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600">Phone</p>
                    <p className="text-sm font-semibold text-gray-900">{vendor.mobileNumber}</p>
                  </div>
                </a>
              )}

              {vendor.businessEmail && (
                <a
                  href={`mailto:${vendor.businessEmail}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <Mail className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600">Email</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{vendor.businessEmail}</p>
                  </div>
                </a>
              )}

              {vendor.website && (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <Globe className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600">Website</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">{vendor.website}</p>
                  </div>
                </a>
              )}
            </div>
          </div>

          {/* Map Embed */}
          {vendor.latitude && vendor.longitude && (
            <div className="space-y-2">
              <h3 className="font-bold text-gray-900">Map Preview</h3>
              <iframe
                width="100%"
                height="300"
                style={{ border: 0, borderRadius: '0.5rem' }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDvY32ZlfVHI7pXUUW8VqcXMWUjI6UJ4r0&q=${vendor.latitude},${vendor.longitude}`}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 p-4 border-t border-gray-200">
          <Button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 rounded-lg transition-colors"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
