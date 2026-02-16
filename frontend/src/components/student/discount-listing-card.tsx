import { Heart, Calendar, Zap, Copy, Check, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';

interface VendorLocation {
  latitude?: number;
  longitude?: number;
  businessAddress?: string;
  city?: string;
  state?: string;
  locality?: string;
  postalCode?: string;
}

interface StudentLocation {
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  locality?: string;
  postalCode?: string;
}

interface DiscountListingCardProps {
  id: string;
  brandName: string;
  brandLogo?: string;
  discount: number;
  description: string;
  expiryDate: string;
  category: string;
  isExclusive?: boolean;
  isLimitedTime?: boolean;
  isSaved?: boolean;
  isLoading?: boolean;
  vendorLocation?: VendorLocation;
  studentLocation?: StudentLocation;
  distance?: string;
  onSave?: (id: string) => void;
  onClaim?: (id: string) => void;
  onViewLocation?: (vendorId: string) => void;
}

export function DiscountListingCard({
  id,
  brandName,
  brandLogo,
  discount,
  description,
  expiryDate,
  category,
  isExclusive = false,
  isLimitedTime = false,
  isSaved = false,
  isLoading = false,
  vendorLocation,
  studentLocation,
  distance,
  onSave,
  onClaim,
  onViewLocation,
}: DiscountListingCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    const code = `STUDENT${discount}${id}`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if vendor is in same city as student
  const isSameLocation = () => {
    if (!vendorLocation?.city || !studentLocation?.city) return false;
    return vendorLocation.city.toLowerCase().trim() === studentLocation.city.toLowerCase().trim();
  };

  const locationDisplay = vendorLocation?.businessAddress || 
    `${vendorLocation?.locality || vendorLocation?.city}, ${vendorLocation?.state}`;

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 h-full flex flex-col">
      {/* Top Section */}
      <div className="relative p-4 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="flex items-start justify-between mb-3">
          {/* Brand Logo */}
          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName} className="w-full h-full object-contain p-1" />
            ) : (
              <span className="text-xs font-bold text-center text-purple-600">
                {(brandName || 'Brand').substring(0, 4).toUpperCase()}
              </span>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={() => onSave?.(id)}
            className={`p-2 rounded-lg transition-all ${
              isSaved
                ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            <Heart className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Brand Info */}
        <h3 className="font-bold text-gray-900 text-lg">{brandName}</h3>
        <p className="text-xs text-gray-600">{category}</p>

        {/* Badges */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {isExclusive && (
            <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
              🎓 Exclusive
            </span>
          )}
          {isLimitedTime && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
              ⏰ Limited
            </span>
          )}
          {isSameLocation() && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
              📍 Same Location
            </span>
          )}
        </div>
      </div>

      {/* Discount Display */}
      <div className="px-4 pt-4 pb-2 flex-grow">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 text-white text-center mb-3">
          <p className="text-sm opacity-90">Save Up To</p>
          <p className="text-4xl font-bold">{discount}%</p>
          <p className="text-xs opacity-90 mt-1">On All Items</p>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{description}</p>
      </div>

      {/* Location Info */}
      {vendorLocation && locationDisplay && (
        <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 flex items-start gap-2 space-y-2">
          <div className="flex-1">
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-900 line-clamp-2 break-words font-medium">{locationDisplay}</p>
                {distance && (
                  <p className="text-xs text-blue-700 mt-1">📍 {distance} km away</p>
                )}
              </div>
            </div>
            {onViewLocation && (
              <button
                onClick={() => onViewLocation(id)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline mt-1 block"
              >
                View on Map →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expiry Date */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-600">
          Expires: <span className="font-semibold text-gray-900">{expiryDate}</span>
        </span>
      </div>

      {/* Action Buttons */}
      <div className="px-4 pb-4 pt-2 space-y-2">
        <Button
          onClick={() => onClaim?.(id)}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Claim Discount
            </>
          )}
        </Button>

        <button
          onClick={handleCopyCode}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Code
            </>
          )}
        </button>
      </div>
    </div>
  );
}
