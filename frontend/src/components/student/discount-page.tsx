import { useState, useEffect } from 'react';
import { StudentSidebar } from './dashboard/sidebar';
import { StudentTopNav } from './dashboard/top-nav';
import { AdvancedSearch } from './advanced-search';
import { DiscountListingCard } from './discount-listing-card';
import { LocationFilter } from './location-filter';
import { VendorLocationModal } from './vendor-location-modal';
import { getStudentLocation, getVendorsByLocation, getVendorLocation } from '../../lib/studentAPI';
import { useAuthStore } from '../../stores/authStore';

interface Discount {
  _id: string;
  id?: string;
  title?: string;
  brandName?: string;
  vendor?: {
    _id: string;
    name: string;
    businessName: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    businessAddress?: string;
    locality?: string;
    postalCode?: string;
    businessLogo?: string;
    businessDescription?: string;
    businessType?: string;
    businessEmail?: string;
    mobileNumber?: string;
    website?: string;
  };
  discount?: number;
  discountPercentage?: number;
  description?: string;
  expiryDate?: string;
  endDate?: string;
  category?: string;
  isActive?: boolean;
  isExclusive?: boolean;
  isLimitedTime?: boolean;
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

interface StudentProfile {
  name: string;
  email: string;
  phone: string;
  college: string;
  course: string;
  yearOfStudy: string;
  studentId: string;
}

interface StudentLocation {
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  locality?: string;
  postalCode?: string;
}

export function StudentDiscountPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [savedOfferIds, setSavedOfferIds] = useState<Set<string>>(new Set());
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimLoading, setClaimLoading] = useState<string | null>(null);
  const [studentLocation, setStudentLocation] = useState<StudentLocation | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'nearby'>('all');
  const [locationSearchActive, setLocationSearchActive] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorData | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [originalDiscounts, setOriginalDiscounts] = useState<Discount[]>([]);

  const { user, token } = useAuthStore();

  const studentProfile: StudentProfile = {
    name: user?.name || 'Student',
    email: user?.email || 'student@university.edu',
    phone: '+91 9876543210',
    college: 'Tech Institute of India',
    course: 'B.Tech Computer Science',
    yearOfStudy: '3rd',
    studentId: 'STU-2024-001234',
  };

  // Fetch real discounts from API
  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        setLoading(true);
        setError(null);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/offers/active`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error('Failed to fetch discounts');
        }
        const data = await response.json();
        // Transform API response to match component's Discount interface
        const transformedData = data.map((offer: any) => ({
          _id: offer._id,
          id: offer._id,
          title: offer.title,
          brandName: offer.vendor?.businessName || offer.vendor?.name || 'Brand',
          vendor: {
            _id: offer.vendor?._id || '',
            name: offer.vendor?.name || '',
            businessName: offer.vendor?.businessName || '',
            city: offer.vendor?.city,
            state: offer.vendor?.state,
            latitude: offer.vendor?.latitude,
            longitude: offer.vendor?.longitude,
            businessAddress: offer.vendor?.businessAddress,
            locality: offer.vendor?.locality,
            postalCode: offer.vendor?.postalCode,
            businessLogo: offer.vendor?.businessLogo,
            businessDescription: offer.vendor?.businessDescription,
            businessType: offer.vendor?.businessType,
            businessEmail: offer.vendor?.businessEmail,
            mobileNumber: offer.vendor?.mobileNumber,
            website: offer.vendor?.website,
          },
          discount: offer.discountPercentage || offer.discount || 0,
          description: offer.description,
          expiryDate: offer.endDate ? new Date(offer.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No expiry',
          category: offer.category || 'General',
          isActive: offer.isActive !== false,
          isExclusive: offer.isExclusive || false,
          isLimitedTime: offer.isLimitedTime || false,
        }));
        setDiscounts(transformedData);
        setOriginalDiscounts(transformedData);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setError('Request timeout - please try again');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load discounts');
        }
        setDiscounts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscounts();
  }, [token]);

  // Fetch student location
  useEffect(() => {
    const fetchStudentLocation = async () => {
      try {
        const result = await getStudentLocation();
        if (result.data) {
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
        console.error('Error fetching student location:', error);
      }
    };

    if (token) {
      fetchStudentLocation();
    }
  }, [token]);

  const handleLocationSearch = async (latitude: number, longitude: number, radius: number) => {
    try {
      setLoading(true);
      setError(null);
      setFilterMode('nearby');
      setLocationSearchActive(true);
      
      const response = await getVendorsByLocation(latitude, longitude, radius);
      if (response.coupons) {
        // Map coupons to discounts format
        const discountsFromLocation = response.coupons.map((coupon: any) => ({
          _id: coupon._id,
          id: coupon._id,
          title: coupon.title,
          brandName: coupon.vendor?.businessName || coupon.vendor?.name || 'Brand',
          vendor: {
            _id: coupon.vendor?._id || '',
            name: coupon.vendor?.name || '',
            businessName: coupon.vendor?.businessName || '',
            city: coupon.vendor?.city,
            state: coupon.vendor?.state,
            latitude: coupon.vendor?.latitude,
            longitude: coupon.vendor?.longitude,
            businessAddress: coupon.vendor?.businessAddress,
            locality: coupon.vendor?.locality,
            postalCode: coupon.vendor?.postalCode,
            businessLogo: coupon.vendor?.businessLogo,
            businessDescription: coupon.vendor?.businessDescription,
            businessType: coupon.vendor?.businessType,
            businessEmail: coupon.vendor?.businessEmail,
            mobileNumber: coupon.vendor?.mobileNumber,
            website: coupon.vendor?.website,
          },
          discount: coupon.discount || 0,
          description: coupon.description,
          expiryDate: coupon.expiryDate,
          category: coupon.category || 'General',
          isActive: true,
          isExclusive: coupon.isExclusive,
          isLimitedTime: coupon.isLimitedTime,
        }));
        setDiscounts(discountsFromLocation);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch nearby vendors');
      console.error('Error searching by location:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLocation = () => {
    setFilterMode('all');
    setLocationSearchActive(false);
    setDiscounts(originalDiscounts);
  };

  const handleViewVendorLocation = async (vendorId: string) => {
    try {
      const response = await getVendorLocation(vendorId);
      setSelectedVendor(response.vendor);
      setIsLocationModalOpen(true);
    } catch (err) {
      console.error('Error fetching vendor location:', err);
      setError('Failed to fetch vendor location details');
    }
  };

  const handleSaveOffer = (id: string) => {
    const newSaved = new Set(savedOfferIds);
    if (newSaved.has(id)) {
      newSaved.delete(id);
    } else {
      newSaved.add(id);
    }
    setSavedOfferIds(newSaved);
  };

  const handleClaimDiscount = async (id: string) => {
    setClaimError(null);
    
    try {
      setClaimLoading(id);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/student/offers/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ offerId: id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to claim offer');
      }

      alert(`✅ Offer claimed successfully! Your redemption code: ${data.redemptionCode}`);
    } catch (err: any) {
      setClaimError(err.message || 'Failed to claim offer');
      console.error('Claim error:', err);
    } finally {
      setClaimLoading(null);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar 
        activeSection="all-discounts" 
        onSectionChange={() => {}}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Navigation */}
        <StudentTopNav 
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          studentName={studentProfile.name}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">All Discounts</h1>
            <AdvancedSearch onSearch={() => {}} onFilterChange={() => {}} />

            {!loading && (
              <>
                {/* Location Filter Section */}
                <div className="mb-8 mt-6">
                  <LocationFilter
                    onLocationSearch={handleLocationSearch}
                    onClearLocation={handleClearLocation}
                    isLoading={loading}
                  />
                </div>

                {/* Active Filter Info */}
                {locationSearchActive && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800">
                      📍 Showing coupons from vendors near your location
                    </p>
                  </div>
                )}
              </>
            )}

            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading discounts...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {claimError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800">{claimError}</p>
              </div>
            )}

            {!loading && discounts.length === 0 && !error && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No discounts available yet. Please check back later!</p>
              </div>
            )}

            {!loading && discounts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {discounts.map((discount) => (
                  <DiscountListingCard
                    key={discount._id}
                    id={discount._id || discount.id || ''}
                    brandName={discount.brandName || 'Brand'}
                    brandLogo={discount.vendor?.businessLogo}
                    discount={discount.discount || 0}
                    description={discount.description || ''}
                    expiryDate={discount.expiryDate || 'No expiry'}
                    category={discount.category || 'General'}
                    isExclusive={discount.isExclusive}
                    isLimitedTime={discount.isLimitedTime}
                    isSaved={savedOfferIds.has(discount._id || '')}
                    isLoading={claimLoading === (discount._id || discount.id)}
                    vendorLocation={{
                      latitude: discount.vendor?.latitude,
                      longitude: discount.vendor?.longitude,
                      businessAddress: discount.vendor?.businessAddress,
                      city: discount.vendor?.city,
                      state: discount.vendor?.state,
                      locality: discount.vendor?.locality,
                      postalCode: discount.vendor?.postalCode,
                    }}
                    studentLocation={studentLocation || undefined}
                    onSave={handleSaveOffer}
                    onClaim={handleClaimDiscount}
                    onViewLocation={(vendorId) => handleViewVendorLocation(discount.vendor?._id || vendorId)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
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
