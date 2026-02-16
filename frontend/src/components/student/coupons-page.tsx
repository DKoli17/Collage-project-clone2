import { useState, useEffect } from 'react';
import { StudentSidebar } from './dashboard/sidebar';
import { StudentTopNav } from './dashboard/top-nav';
import { MyCoupons } from './my-coupons';
import { DiscountListingCard } from './discount-listing-card';
import { LocationFilter } from './location-filter';
import { VendorLocationModal } from './vendor-location-modal';
import { getActiveCoupons, getCouponsWithLocation, getVendorsByLocation, getVerificationStatus, getVendorLocation, getStudentLocation } from '../../lib/studentAPI';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';

interface StudentProfile {
  name: string;
  email: string;
  phone: string;
  college: string;
  course: string;
  yearOfStudy: string;
  studentId: string;
  verificationStatus: 'verified' | 'pending' | 'rejected';
}

interface Coupon {
  _id?: string;
  id?: string;
  code: string;
  brand: string;
  discount: number;
  expiryDate: string;
  status: 'used' | 'unused' | 'expired';
  claimedDate: string;
  usageDate?: string;
  description?: string;
  category?: string;
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

export function StudentCouponsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [filterMode, setFilterMode] = useState<'all' | 'nearby'>('all');
  const [locationSearchActive, setLocationSearchActive] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorData | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [studentLocation, setStudentLocation] = useState<StudentLocation | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const { token, user, updateUser } = useAuthStore();

  const studentProfile: StudentProfile = {
    name: user?.name || 'Student',
    email: user?.email || 'student@university.edu',
    phone: '+91 9876543210',
    college: 'Tech Institute of India',
    course: 'B.Tech Computer Science',
    yearOfStudy: '3rd',
    studentId: 'STU-2024-001234',
    verificationStatus: 'verified',
  };

  // Listen for student approval updates and real-time coupon/offer updates
  const handleOffersUpdate = async (offersData: any) => {
    // Real-time offers/coupons updates
    console.log('🔄 Real-time offers update received:', offersData.offers?.length || 0, 'offers');
    if (offersData.offers && offersData.offers.length > 0 && filterMode === 'all') {
      // If in 'all' mode, refresh coupons list
      try {
        setLoading(true);
        setError(null);
        const response = await getCouponsWithLocation();
        if (response.coupons) {
          setCoupons(response.coupons);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch coupons');
        console.error('Error fetching coupons:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useRealtimeUpdates(
    (update) => {
      // When student status is updated by admin (approval/rejection)
      if (update.student) {
        // Update the user in auth store with new approval status
        updateUser({
          approvalStatus: update.student.approvalStatus || update.approvalStatus,
        });
        setApprovalStatus(update.student.approvalStatus || update.approvalStatus);
      }
    },
    undefined,
    undefined,
    undefined,
    undefined,
    handleOffersUpdate,
    undefined,
    (connected) => {
      // Connection status
      setRealtimeConnected(connected);
      console.log(connected ? '✅ Real-time connected' : '❌ Real-time disconnected');
    }
  );

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

  useEffect(() => {
    // Fetch latest approval status from backend
    const fetchApprovalStatus = async () => {
      try {
        const status = await getVerificationStatus();
        if (status?.approvalStatus) {
          setApprovalStatus(status.approvalStatus as 'pending' | 'approved' | 'rejected');
          // Also update the auth store
          updateUser({
            approvalStatus: status.approvalStatus,
          });
        }
      } catch (err) {
        console.error('Error fetching approval status:', err);
        // Fall back to user store if fetch fails
        if (user?.approvalStatus) {
          setApprovalStatus(user.approvalStatus as 'pending' | 'approved' | 'rejected');
        }
      }
    };

    if (token) {
      fetchApprovalStatus();
      if (filterMode === 'all') {
        fetchCoupons();
      }

      // Refresh approval status every 30 seconds to catch admin updates
      const approvalStatusInterval = setInterval(() => {
        fetchApprovalStatus();
      }, 30000);

      return () => clearInterval(approvalStatusInterval);
    }
  }, [token, filterMode]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCouponsWithLocation();
      if (response.coupons) {
        setCoupons(response.coupons);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch coupons');
      console.error('Error fetching coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSearch = async (latitude: number, longitude: number, radius: number) => {
    try {
      setLoading(true);
      setError(null);
      setFilterMode('nearby');
      setLocationSearchActive(true);
      
      const response = await getVendorsByLocation(latitude, longitude, radius);
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

  const handleClearLocation = () => {
    setFilterMode('all');
    setLocationSearchActive(false);
    fetchCoupons();
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

  const handleRemoveCoupon = (id: string) => {
    setCoupons((prev) => prev.filter((coupon) => coupon.id !== id && coupon._id !== id));
  };

  // Calculate statistics
  const unusedCount = coupons.filter((c) => c.status === 'unused').length;
  const usedCount = coupons.filter((c) => c.status === 'used').length;
  const expiredCount = coupons.filter((c) => c.status === 'expired').length;
  const totalDiscount = coupons.filter((c) => c.status === 'unused').reduce((sum, c) => sum + c.discount, 0);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar 
        activeSection="my-coupons" 
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
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Available Coupons & Discounts</h1>
              {/* Real-time Connection Status */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full animate-pulse ${realtimeConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-gray-600">
                  {realtimeConnected ? 'Live Updates' : 'Offline'}
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Location Filter Section */}
                <div className="mb-8">
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

                {/* Statistics Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                    <p className="text-gray-600 text-sm font-medium mb-2">Available Coupons</p>
                    <p className="text-3xl font-bold text-green-600">{coupons.length}</p>
                    <p className="text-xs text-gray-500 mt-2">Ready to claim</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                    <p className="text-gray-600 text-sm font-medium mb-2">View Mode</p>
                    <p className="text-3xl font-bold text-blue-600">{filterMode === 'nearby' ? '📍' : '🎯'}</p>
                    <p className="text-xs text-gray-500 mt-2">{filterMode === 'nearby' ? 'Nearby vendors' : 'All vendors'}</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                    <p className="text-gray-600 text-sm font-medium mb-2">With Location</p>
                    <p className="text-3xl font-bold text-purple-600">{coupons.filter(c => c.vendor?.latitude).length}</p>
                    <p className="text-xs text-gray-500 mt-2">Have address info</p>
                  </div>
                </div>

                {/* Coupons Grid */}
                {coupons.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coupons.map((coupon) => (
                      <DiscountListingCard
                        key={coupon._id || coupon.id}
                        id={coupon._id || coupon.id || ''}
                        brandName={coupon.vendor?.businessName || coupon.brand || 'Unknown Brand'}
                        brandLogo={coupon.vendor?.businessLogo}
                        discount={coupon.discount}
                        description={coupon.description || 'Get exciting discounts'}
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
                        onViewLocation={(vendorId) => handleViewVendorLocation(coupon.vendor?._id || vendorId)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <p className="text-gray-600 text-lg mb-4">
                      {locationSearchActive ? '📍 No coupons found in this location' : '🎯 No coupons available yet'}
                    </p>
                    {locationSearchActive && (
                      <button
                        onClick={handleClearLocation}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Clear location filter →
                      </button>
                    )}
                  </div>
                )}
              </>
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
