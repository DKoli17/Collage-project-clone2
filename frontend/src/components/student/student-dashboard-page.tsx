import { useState, useEffect } from 'react';
import { StudentSidebar } from './dashboard/sidebar';
import { StudentTopNav } from './dashboard/top-nav';
import { DashboardHeader } from './dashboard-header';
import { AnalyticsSummary } from './analytics-summary';
import { AdvancedSearch } from './advanced-search';
import { DiscountListingCard } from './discount-listing-card';
import { MyCoupons } from './my-coupons';
import { SavedOffers } from './saved-offers';
import { NotificationsPanel } from './notifications-panel';
import { HelpSupport } from './help-support';
import { getStudentDiscounts, getActiveCoupons, getVerificationStatus, getStudentLocation } from '../../lib/studentAPI';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';

// Mock data types
interface Discount {
  id: string;
  brandName: string;
  discount: number;
  description: string;
  expiryDate: string;
  category: string;
  isExclusive?: boolean;
  isLimitedTime?: boolean;
}

interface Coupon {
  id: string;
  code: string;
  brand: string;
  discount: number;
  expiryDate: string;
  status: 'used' | 'unused' | 'expired';
  claimedDate: string;
  usageDate?: string;
}

interface SavedOffer {
  id: string;
  brandName: string;
  discount: number;
  category: string;
  expiryDate: string;
  description: string;
  savedDate: string;
}

interface Notification {
  id: string;
  type: 'new_discount' | 'expiring' | 'verification' | 'announcement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface StudentProfile {
  name: string;
  email: string;
  phone: string;
  college: string;
  course: string;
  yearOfStudy: string;
  studentId: string;
  verificationStatus: 'verified' | 'pending' | 'rejected';
  profileImage?: string;
}

interface StudentLocation {
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  locality?: string;
  postalCode?: string;
}

// Mock notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'new_discount',
    title: 'New Exclusive Discount!',
    message: 'Zomato is offering 50% off for verified students',
    timestamp: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    type: 'expiring',
    title: 'Offer Expiring Soon',
    message: 'Your Amazon discount expires in 5 days',
    timestamp: '1 day ago',
    read: true,
  },
];

export function StudentDashboardPage() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'all-discounts' | 'categories' | 'my-coupons' | 'saved' | 'notifications' | 'profile' | 'help-support'
  >('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [savedOfferIds, setSavedOfferIds] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState(mockNotifications);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [savedOffers, setSavedOffers] = useState<SavedOffer[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [claimLoading, setClaimLoading] = useState<string | null>(null);
  const [studentLocation, setStudentLocation] = useState<StudentLocation | null>(null);
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

  // Listen for student approval updates from admin
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
    }
  );

  useEffect(() => {
    if (token) {
      fetchApprovalStatus();
      fetchDiscounts();
      fetchCoupons();
      fetchSavedOffers();
      fetchStudentLocation();

      // Refresh approval status every 30 seconds to catch admin updates
      const approvalStatusInterval = setInterval(() => {
        fetchApprovalStatus();
      }, 30000);

      return () => clearInterval(approvalStatusInterval);
    }
  }, [token]);

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

  const fetchApprovalStatus = async () => {
    try {
      // Fetch latest approval status from backend
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

  const fetchDiscounts = async () => {
    try {
      const response = await getStudentDiscounts();
      if (response.offers) {
        const transformedDiscounts = response.offers.map((offer: any) => ({
          id: offer._id || offer.id || Math.random().toString(),
          brandName: offer.vendor?.businessName || offer.vendor?.name || offer.brandName || 'Brand',
          discount: offer.discountPercentage || offer.discount || 0,
          description: offer.description || '',
          expiryDate: offer.endDate ? new Date(offer.endDate).toLocaleDateString('en-GB') : 'No expiry',
          category: offer.category || 'General',
          isExclusive: offer.isExclusive || false,
          isLimitedTime: offer.isLimitedTime || false,
        }));
        setDiscounts(transformedDiscounts);
      }
    } catch (err) {
      console.error('Error fetching discounts:', err);
      setDiscounts([]);
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await getActiveCoupons();
      if (response.coupons) {
        const transformedCoupons = response.coupons.map((coupon: any) => ({
          id: coupon._id || coupon.id || Math.random().toString(),
          code: coupon.code || '',
          brand: coupon.brand || 'Brand',
          discount: coupon.discount || coupon.discountPercentage || 0,
          expiryDate: coupon.expiryDate || 'No expiry',
          status: coupon.status || 'unused',
          claimedDate: coupon.claimedDate || new Date().toLocaleDateString('en-GB'),
          usageDate: coupon.usageDate,
        }));
        setCoupons(transformedCoupons);
      }
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setCoupons([]);
    }
  };

  const fetchSavedOffers = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/student/offers/saved', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const offers = Array.isArray(data) ? data : data.offers || [];
        setSavedOffers(offers);
        
        // Calculate total saved amount
        const total = offers.reduce((sum: number, offer: any) => {
          return sum + (offer.discountPercentage || offer.discount || 0);
        }, 0) * 100; // Approximate savings calculation
        setTotalSaved(total);
        
        // Set saved offer IDs
        const savedIds = new Set<string>(offers.map((o: any) => (o._id || o.id) as string));
        setSavedOfferIds(savedIds);
      }
    } catch (err) {
      console.error('Error fetching saved offers:', err);
      setSavedOffers([]);
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
      alert(`❌ ${err.message || 'Failed to claim offer'}`);
      console.error('Claim error:', err);
    } finally {
      setClaimLoading(null);
    }
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const renderSection = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <DashboardHeader
              studentName={studentProfile.name}
              studentEmail={studentProfile.email}
              verificationStatus={studentProfile.verificationStatus}
              lastVerificationDate="5 Jan, 2026"
            />

            <AnalyticsSummary
              activeDiscounts={discounts.length}
              totalSaved={totalSaved}
              couponsClaimed={coupons.filter((c) => c.status === 'used').length}
              activeCoupons={coupons.filter((c) => c.status === 'unused').length}
            />

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Discounts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {discounts.slice(0, 3).map((discount) => (
                <DiscountListingCard
                  key={discount.id}
                  {...discount}
                  isSaved={savedOfferIds.has(discount.id)}
                  isLoading={claimLoading === discount.id}
                  onSave={handleSaveOffer}
                  onClaim={handleClaimDiscount}
                />
              ))}
            </div>
          </>
        )
      case 'all-discounts':
        return (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">All Discounts</h1>
            <AdvancedSearch onSearch={() => {}} onFilterChange={() => {}} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {discounts.map((discount) => (
                <DiscountListingCard
                  key={discount.id}
                  {...discount}
                  isSaved={savedOfferIds.has(discount.id)}
                  isLoading={claimLoading === discount.id}
                  studentLocation={studentLocation || undefined}
                  onSave={handleSaveOffer}
                  onClaim={handleClaimDiscount}
                />
              ))}
            </div>
          </>
        )
      case 'my-coupons':
        return (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">My Coupons</h1>
            <MyCoupons 
              coupons={coupons}
            />
          </>
        )
      case 'saved':
        return (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Saved Offers</h1>
            <SavedOffers
              offers={savedOffers.map((offer: any) => ({
                id: offer._id || offer.id,
                brandName: offer.vendor?.businessName || offer.vendor?.name || offer.brandName || 'Brand',
                discount: offer.discountPercentage || offer.discount || 0,
                category: offer.category || 'General',
                expiryDate: offer.endDate ? new Date(offer.endDate).toLocaleDateString('en-GB') : 'No expiry',
                description: offer.description || 'Special discount offer',
                savedDate: new Date().toLocaleDateString('en-GB'),
              }))}
              onRemove={(id) => setSavedOfferIds(new Set([...savedOfferIds].filter((x) => x !== id)))}
            />
          </>
        )
      case 'notifications':
        return (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Notifications</h1>
            <NotificationsPanel
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onDismiss={(id) => setNotifications((prev) => prev.filter((n) => n.id !== id))}
            />
          </>
        )
      case 'help-support':
        return <HelpSupport />
      case 'profile':
        return (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile & Verification</h1>
            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{studentProfile.name}</h2>
                  <p className="text-gray-600">{studentProfile.email}</p>
                </div>
                <button
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 font-medium"
                >
                  Edit Profile
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-600 text-sm">Phone</p>
                  <p className="text-lg font-semibold text-gray-900">{studentProfile.phone}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">College</p>
                  <p className="text-lg font-semibold text-gray-900">{studentProfile.college}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Course</p>
                  <p className="text-lg font-semibold text-gray-900">{studentProfile.course}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Student ID</p>
                  <p className="text-lg font-semibold text-gray-900">{studentProfile.studentId}</p>
                </div>
              </div>
            </div>
          </>
        )
      case 'categories':
      default:
        return (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">All Discounts</h1>
            <AdvancedSearch onSearch={() => {}} onFilterChange={() => {}} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {discounts.map((discount) => (
                <DiscountListingCard
                  key={discount.id}
                  {...discount}
                  isSaved={savedOfferIds.has(discount.id)}
                  isApproved={approvalStatus === 'approved'}
                  isLoading={claimLoading === discount.id}
                  onSave={handleSaveOffer}
                  onClaim={handleClaimDiscount}
                />
              ))}
            </div>
          </>
        )
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar 
        activeSection={activeTab} 
        onSectionChange={(section: string) => setActiveTab(section as any)}
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
            {renderSection()}
          </div>
        </main>
      </div>

      {/* Profile Modal removed */}
    </div>
  );
}
