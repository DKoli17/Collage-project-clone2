import { useState, useEffect } from 'react';
import { StudentLocationShare } from './student-location-share';
import { LocationFilter } from './location-filter';
import { DiscountListingCard } from './discount-listing-card';
import { VendorLocationModal } from './vendor-location-modal';
import { getNearbyVendorsForClaim, getStudentLocation } from '../../lib/studentAPI';

interface Coupon {
  _id?: string;
  id?: string;
  code: string;
  discount: number;
  vendor?: {
    _id: string;
    name: string;
    businessName: string;
    businessType?: string;
    businessAddress?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    locality?: string;
    postalCode?: string;
    businessLogo?: string;
    businessDescription?: string;
    businessEmail?: string;
    mobileNumber?: string;
    website?: string;
  };
  description?: string;
  expiryDate?: string;
  category?: string;
  isActive?: boolean;
  approvalStatus?: string;
}

interface VendorData {
  _id: string;
  name: string;
  businessName: string;
  businessType?: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  locality?: string;
  postalCode?: string;
  businessLogo?: string;
  businessEmail?: string;
  mobileNumber?: string;
  website?: string;
  businessDescription?: string;
  distance?: string;
}

interface StudentLocation {
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  locality?: string;
  postalCode?: string;
}

export function FindVendorsByLocationPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorData | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationShared, setLocationShared] = useState(false);
  const [studentLocation, setStudentLocation] = useState<StudentLocation | null>(null);

  // Check if student has location on mount
  useEffect(() => {
    checkStudentLocation();
  }, []);

  const checkStudentLocation = async () => {
    try {
      const result = await getStudentLocation();
      if (result.data && result.data.latitude && result.data.longitude) {
        setLocationShared(true);
        setStudentLocation({
          latitude: result.data.latitude,
          longitude: result.data.longitude,
          city: result.data.city,
          state: result.data.state,
          locality: result.data.locality,
          postalCode: result.data.postalCode,
        });
      }
    } catch (error) {
      console.error('Error checking student location:', error);
    }
  };

  const handleLocationUpdated = () => {
    setLocationShared(true);
    // Fetch full location data after update
    checkStudentLocation();
  };

  const handleLocationSearch = async (_latitude: number, _longitude: number, radius: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await getNearbyVendorsForClaim(radius);
      if (response.coupons) {
        setCoupons(response.coupons);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch nearby vendors');
      console.error('Error searching by location:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewVendorLocation = (vendorId: string) => {
    const vendor = coupons
      .find(c => c.vendor?._id === vendorId)
      ?.vendor;
    
    if (vendor) {
      setSelectedVendor(vendor as VendorData);
      setIsLocationModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎯 Find & Claim Vendor Discounts
          </h1>
          <p className="text-gray-600">
            Share your location so vendors nearby can find you and attract you with special discounts
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Location Setup */}
          <div className="lg:col-span-1 space-y-6">
            {/* Student Location Share */}
            <StudentLocationShare
              onLocationUpdated={handleLocationUpdated}
              isLoading={loading}
            />

            {/* Info Card */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-4">
              <h3 className="font-bold text-blue-900 mb-3">✓ How It Works</h3>
              <ol className="text-sm text-blue-800 space-y-2">
                <li><strong>1.</strong> Share your location</li>
                <li><strong>2.</strong> Vendors find you nearby</li>
                <li><strong>3.</strong> Discover special offers</li>
                <li><strong>4.</strong> Claim coupons instantly</li>
              </ol>
            </div>

            {/* Status Card */}
            {locationShared && (
              <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                <p className="text-sm text-green-800">
                  <span className="font-bold">✓ Your location is shared!</span>
                </p>
                <p className="text-xs text-green-700 mt-2">
                  Nearby vendors can now see you and send you special discounts.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Vendor Discovery */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Filter */}
            <LocationFilter
              onLocationSearch={handleLocationSearch}
              isLoading={loading}
              currentLocation={studentLocation && studentLocation.latitude && studentLocation.longitude ? { lat: studentLocation.latitude, lng: studentLocation.longitude } : null}
            />

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Coupons Grid */}
            {!loading && coupons.length > 0 && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-900">
                    📍 Found <span className="text-lg text-blue-600">{coupons.length}</span> coupons from nearby vendors
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {coupons.map((coupon) => (
                    <DiscountListingCard
                      key={coupon._id || coupon.id}
                      id={coupon._id || coupon.id || ''}
                      brandName={coupon.vendor?.businessName || 'Unknown Vendor'}
                      brandLogo={coupon.vendor?.businessLogo}
                      discount={coupon.discount}
                      description={coupon.description || 'Great discount on items'}
                      expiryDate={coupon.expiryDate || 'N/A'}
                      category={coupon.category || coupon.vendor?.businessType || 'General'}
                      vendorLocation={{
                        latitude: coupon.vendor?.latitude,
                        longitude: coupon.vendor?.longitude,
                        businessAddress: coupon.vendor?.businessAddress,
                        city: coupon.vendor?.city,
                        state: coupon.vendor?.state,
                        locality: coupon.vendor?.locality,
                        postalCode: coupon.vendor?.postalCode,
                      }}
                      studentLocation={studentLocation || undefined}
                      onViewLocation={(vendorId) => handleViewVendorLocation(vendorId)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Empty State */}
            {!loading && coupons.length === 0 && !error && (
              <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-gray-600 text-lg font-semibold mb-2">
                  No vendors found yet
                </p>
                <p className="text-gray-500 text-sm">
                  {locationShared
                    ? 'Share your location and adjust the search radius to find vendors nearby'
                    : 'Share your location first to discover vendors near you'}
                </p>
              </div>
            )}

            {/* Stats */}
            {coupons.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-4 border border-gray-100 text-center">
                  <p className="text-2xl font-bold text-blue-600">{coupons.length}</p>
                  <p className="text-xs text-gray-600 mt-1">Coupons</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-100 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {new Set(coupons.map(c => c.vendor?._id)).size}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Vendors</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-100 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.max(...coupons.map(c => c.discount), 0)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Max Discount</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Location Modal */}
      <VendorLocationModal
        isOpen={isLocationModalOpen}
        vendor={selectedVendor}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
}
