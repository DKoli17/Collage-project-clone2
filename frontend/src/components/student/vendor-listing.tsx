import { useState, useEffect } from 'react';
import { Search, MapPin, TrendingUp, ChevronRight, Tag, Clock, AlertCircle, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { getAllVendors } from '../../lib/marketplaceAPI';
import { VendorPaymentDialog } from './vendor-payment-dialog';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

interface Coupon {
  _id: string;
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  description?: string;
  category?: string;
  discount_display?: string;
  status?: string;
  approvalStatus?: string;
}

interface Vendor {
  _id: string;
  name: string;
  businessName: string;
  businessDescription?: string;
  businessType?: string;
  city?: string;
  locality?: string;
  businessLogo?: string;
  availableOffers: number;
  avgDiscount?: number;
  bestDiscount?: number;
  offers?: Coupon[];
  rating?: number;
  isActive?: boolean;
}

interface VendorListingProps {
  onSelectOffer?: (offer: any, vendor: Vendor) => void;
}

export function VendorListing({ onSelectOffer: _onSelectOffer }: VendorListingProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [recentlyUpdatedCoupons, setRecentlyUpdatedCoupons] = useState<Set<string>>(new Set());
  const [updateTimestamp, setUpdateTimestamp] = useState<{ [key: string]: number }>({});
  const [recentlyUpdatedVendors, setRecentlyUpdatedVendors] = useState<Set<string>>(new Set());
  const [vendorCouponCounts, setVendorCouponCounts] = useState<{ [key: string]: number }>({});

  // Fetch vendors with approved coupons
  const fetchVendors = async () => {
    try {
      setError(null);
      setLoading(true);
      console.log('📡 Fetching vendors from API...');
      console.log('🔗 Using API Base URL:', import.meta.env.VITE_API_URL);

      const response = await getAllVendors({
        search: search || undefined,
        page,
        limit: 8,
      });

      console.log('✅ Response received:', response);

      if (response?.vendors) {
        console.log(`✨ Found ${response.vendors.length} vendors with coupons`);
        
        // Track recently updated vendors and coupons
        const newVendors = new Set<string>();
        const newCoupons = new Set<string>();
        
        response.vendors.forEach((vendor: Vendor) => {
          const currentCouponCount = vendor.offers?.length || 0;
          const previousCouponCount = vendorCouponCounts[vendor._id] || 0;
          
          // If vendor has more coupons than before, mark as updated
          if (currentCouponCount > previousCouponCount) {
            newVendors.add(vendor._id);
            console.log(`✨ Vendor ${vendor.businessName} got ${currentCouponCount - previousCouponCount} new coupon(s)`);
          }
          
          // Update coupon count tracking
          setVendorCouponCounts(prev => ({
            ...prev,
            [vendor._id]: currentCouponCount
          }));
          
          // Track individual coupons as new if we haven't seen them before
          vendor.offers?.forEach((coupon: Coupon) => {
            if (updateTimestamp[coupon._id] === undefined) {
              newCoupons.add(coupon._id);
              setUpdateTimestamp(prev => ({
                ...prev,
                [coupon._id]: Date.now()
              }));
            }
          });
        });

        // Show "NEW" badge for vendors with new coupons
        if (newVendors.size > 0) {
          setRecentlyUpdatedVendors(prev => new Set([...prev, ...newVendors]));
          setTimeout(() => {
            setRecentlyUpdatedVendors(new Set());
          }, 6000);
        }

        // Show "LIVE" badge for new coupons
        if (newCoupons.size > 0) {
          setRecentlyUpdatedCoupons(prev => new Set([...prev, ...newCoupons]));
          setTimeout(() => {
            setRecentlyUpdatedCoupons(new Set());
          }, 5000);
        }
        
        setVendors(response.vendors);
        setTotalPages(response.pagination?.pages || 1);
      } else {
        console.warn('⚠️ Unexpected response format:', response);
        setError('Unexpected response format from server');
        setVendors([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch vendors:', error.message);
      setError(`Error: ${error.message || 'Failed to fetch vendors'}`);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [search, page]);

  // Set up real-time Socket.io updates for active coupons
  useEffect(() => {
    let socket: any = null;
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'],
        upgrade: true,
      });

      // Helper function to debounce vendor list refresh
      const scheduleRefresh = () => {
        // Clear any pending refresh
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        // Schedule new refresh in 500ms to batch multiple events
        refreshTimeout = setTimeout(() => {
          console.log('🔄 Refreshing vendor list with real-time updates');
          fetchVendors();
        }, 500);
      };

      // Listen for new coupons - Show real-time badge indicator
      socket.on('coupon:created', (data: any) => {
        console.log('✨ New coupon created in real-time:', data);
        scheduleRefresh();
      });

      // Listen for coupon updates (status changes, discount updates, etc)
      socket.on('coupon:updated', (data: any) => {
        console.log('🔄 Coupon updated in real-time:', data);
        scheduleRefresh();
      });

      // Listen for coupon approval - Most important for showing new active coupons
      socket.on('coupon:approved', (data: any) => {
        console.log('✅ Coupon approved and now active:', data);
        scheduleRefresh();
      });

      // Listen for new offers (legacy support)
      socket.on('offer:new', (data: any) => {
        console.log('🎁 New offer detected in real-time:', data);
        scheduleRefresh();
      });

      // Listen for vendors update - When vendor goes online/offline
      socket.on('vendors:updated', (data: any) => {
        console.log('🏪 Vendors status updated:', data);
        scheduleRefresh();
      });

      // Listen for offer creation - When vendor creates new offers
      socket.on('offer:created', (data: any) => {
        console.log('📌 Offer created in real-time:', data);
        scheduleRefresh();
      });

      // Listen for offer activation - When offers become active
      socket.on('student:offer-activated', (data: any) => {
        console.log('🚀 Offer activated:', data);
        scheduleRefresh();
      });

      // Listen for student new offer notification - Direct offer updates
      socket.on('student:new-offer', (data: any) => {
        console.log('🎉 New offer available:', data);
        scheduleRefresh();
      });

      socket.on('connect', () => {
        console.log('✅ Connected to real-time updates');
        console.log('📡 Socket ID:', socket.id);
        setSocketConnected(true);
        // Refresh on reconnect to get latest data
        fetchVendors();
      });

      socket.on('disconnect', () => {
        console.log('⚠️ Disconnected from real-time updates - will reconnect automatically');
        setSocketConnected(false);
      });

      socket.on('connect_error', (error: any) => {
        console.warn('Socket.io connection error (non-blocking):', error.message);
        setSocketConnected(false);
      });

      socket.on('error', (error: any) => {
        console.warn('Socket.io error (non-blocking):', error);
        setSocketConnected(false);
      });
    } catch (error) {
      console.warn('Socket.io initialization warning (non-blocking):', error);
      // Connection errors are non-blocking - vendors list will still load
    }

    return () => {
      // Cleanup
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const toggleVendorExpand = (vendorId: string) => {
    setExpandedVendors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(vendorId)) {
        newSet.delete(vendorId);
      } else {
        newSet.add(vendorId);
      }
      return newSet;
    });
  };

  const handleClaimCoupon = (coupon: Coupon, vendor: Vendor) => {
    setSelectedVendor(vendor);
    setSelectedCoupon(coupon);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = (_coupon: any) => {
    // Refresh vendors list to show updated coupon status
    fetchVendors();
  };

  const getDiscountLabel = (discount: number, type: string) => {
    return type === 'percentage' ? `${discount}%` : `₹${discount}`;
  };

  const getDiscountColor = (discount: number) => {
    if (discount >= 50) return 'bg-red-100 text-red-700 border-red-200';
    if (discount >= 30) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  };

  return (
    <div className="w-full">
      {/* Real-time Status Indicator - Enhanced */}
      <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-300 ${
        socketConnected 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-md shadow-green-100' 
          : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 shadow-md shadow-amber-100'
      }`}>
        <div className={`flex items-center gap-2`}>
          {socketConnected ? (
            <>
              <Zap className="w-4 h-4 text-green-600 animate-pulse" />
              <span className="text-xs font-bold text-green-700">⚡ Live Real-Time Updates</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></div>
              <span className="text-xs font-bold text-amber-700">🔄 Reconnecting to Live Updates...</span>
            </>
          )}
        </div>
        {socketConnected && (
          <span className="ml-auto text-xs text-green-600 font-medium">Active vendors & coupons updating in real-time</span>
        )}
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🏪 Browse Vendors & Coupons</h1>
        <p className="text-gray-600">
          Explore all vendors and their exclusive discount coupons available for students
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          <p className="text-red-800"><strong>Error:</strong> {error}</p>
          <button 
            onClick={fetchVendors}
            className="mt-2 text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search vendors, businesses, or discounts..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vendors Found</h3>
          <p className="text-gray-600">
            {search
              ? 'Try adjusting your search term'
              : 'No vendors with coupons available at the moment'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {vendors.map((vendor) => (
              <div
                key={vendor._id}
                className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 ${
                  recentlyUpdatedVendors.has(vendor._id)
                    ? 'ring-2 ring-green-500 shadow-lg shadow-green-200'
                    : ''
                }`}
              >
                {/* "NEW OFFERS" Badge for Recently Updated Vendors */}
                {recentlyUpdatedVendors.has(vendor._id) && (
                  <div className="absolute top-2 right-2 z-10 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full animate-bounce">
                    🆕 New Offers
                  </div>
                )}

                {/* Vendor Logo if available */}
                {vendor.businessLogo && (
                  <div className="h-40 bg-gray-100 overflow-hidden flex items-center justify-center">
                    <img
                      src={vendor.businessLogo}
                      alt={vendor.businessName}
                      className="max-h-full max-w-full object-contain p-2"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Vendor Header */}
                <div className={`${vendor.businessLogo ? '' : 'bg-gradient-to-r from-purple-500 to-pink-500'} p-4 text-white`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{vendor.businessName}</h3>
                      {(vendor.city || vendor.locality) && (
                        <div className="flex items-center gap-1 text-sm opacity-90">
                          <MapPin className="w-4 h-4" />
                          {[vendor.locality, vendor.city].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vendor Info */}
                <div className="p-4">
                  {/* Active Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                      Active Vendor
                    </span>
                    {vendor.rating && vendor.rating > 0 && (
                      <span className="text-sm text-gray-600">⭐ {vendor.rating}</span>
                    )}
                  </div>

                  {vendor.businessDescription && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {vendor.businessDescription}
                    </p>
                  )}

                  {/* Offers Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 mb-4 border border-blue-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">📦 Active Coupons</span>
                      <span className="text-lg font-bold text-blue-600">{vendor.availableOffers}</span>
                    </div>
                    {vendor.bestDiscount && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Best Discount:</span>
                        <span className="font-bold text-orange-600">{vendor.bestDiscount}%</span>
                      </div>
                    )}
                    {vendor.avgDiscount && (
                      <p className="text-xs text-gray-600 mt-1">
                        Avg Discount: {vendor.avgDiscount}%
                      </p>
                    )}
                  </div>

                  {/* Show/Hide Coupons Button */}
                  <button
                    onClick={() => toggleVendorExpand(vendor._id)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors mb-4 border border-purple-200"
                  >
                    <span className="text-purple-700 font-semibold text-sm">
                      {expandedVendors.has(vendor._id) ? '▼ Hide Coupons' : '▶ View Coupons'}
                    </span>
                    <ChevronRight
                      className={`w-5 h-5 text-purple-700 transition-transform ${
                        expandedVendors.has(vendor._id) ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {/* Expanded Coupons List */}
                  {expandedVendors.has(vendor._id) && (
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                      {vendor.offers && vendor.offers.length > 0 ? (
                        vendor.offers.map((coupon) => (
                          <div
                            key={coupon._id}
                            className={`bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 hover:shadow-md transition-all border ${
                              recentlyUpdatedCoupons.has(coupon._id)
                                ? 'border-green-500 shadow-md shadow-green-200'
                                : 'border-green-200'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Tag className="w-4 h-4 text-green-600" />
                                  <h4 className="font-semibold text-gray-800 text-sm">
                                    {coupon.code}
                                  </h4>
                                  {recentlyUpdatedCoupons.has(coupon._id) && (
                                    <span className="ml-auto text-xs px-2 py-0.5 bg-green-500 text-white rounded-full font-bold animate-pulse">
                                      🔴 LIVE
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-1 pl-6">
                                  {coupon.description || coupon.category || 'Exclusive discount coupon'}
                                </p>
                              </div>
                              <span
                                className={`ml-2 px-2.5 py-1.5 rounded-lg text-sm font-bold border ${getDiscountColor(
                                  coupon.discount
                                )} shadow-sm`}
                              >
                                {coupon.discount_display || getDiscountLabel(coupon.discount, coupon.discountType)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pl-6">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {coupon.category && `${coupon.category}`}
                              </div>
                              <button
                                onClick={() => handleClaimCoupon(coupon, vendor)}
                                className="text-xs px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
                              >
                                Redeem Now
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No active coupons at the moment</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mb-8">
              <Button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </Button>
              <div className="flex items-center gap-2">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-2 rounded-lg ${
                        page === pageNum
                          ? 'bg-purple-500 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
      
      <VendorPaymentDialog
        vendor={selectedVendor}
        coupon={selectedCoupon}
        isOpen={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
