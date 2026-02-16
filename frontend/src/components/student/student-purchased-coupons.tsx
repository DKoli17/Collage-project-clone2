import { useState, useEffect } from 'react';
import { Copy, Check, Calendar, Tag, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../lib/api';
import { useRealtimeStudentCoupons } from '../../hooks/useRealtimeStudentCoupons';

interface CouponPurchase {
  _id: string;
  couponCode: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  expiryDate: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  platformSellingPrice: number;
  vendorId: {
    _id: string;
    name: string;
    businessName: string;
  };
  offerId: {
    _id: string;
    title: string;
    description: string;
    category: string;
  };
  purchasedAt: string;
  usedAt?: string;
}

export function StudentPurchasedCoupons() {
  const [filteredCoupons, setFilteredCoupons] = useState<CouponPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'used' | 'expired'>('active');
  const [stats, setStats] = useState({ total: 0, active: 0, used: 0, expired: 0 });
  const [socketConnected, setSocketConnected] = useState(false);
  const [newPurchaseNotification, setNewPurchaseNotification] = useState<string | null>(null);

  // Real-time coupon updates
  useRealtimeStudentCoupons(
    (purchase) => {
      console.log('🎉 New purchase received:', purchase);
      // Refresh coupons list when new purchase is made
      fetchCoupons();
      setNewPurchaseNotification(`You purchased ${purchase.purchases.length} coupon(s)!`);
      setTimeout(() => setNewPurchaseNotification(null), 5000);
    },
    (redeemed) => {
      console.log('✅ Coupon redeemed:', redeemed);
      // Update the coupons list to show redeemed status
      fetchCoupons();
    },
    (availability) => {
      console.log('📊 Availability changed:', availability);
      // Refresh coupons when availability changes
      fetchCoupons();
    },
    (status) => {
      setSocketConnected(status);
      console.log('📡 Socket connection status:', status);
    }
  );

  useEffect(() => {
    fetchCoupons();
  }, [statusFilter]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '100',
        page: '1',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await api.get(`/coupon-purchase/my-purchases?${params}`);
      setFilteredCoupons(response.data.purchases);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    const badgeStyles = {
      active: 'bg-green-100 text-green-800 border-green-300',
      used: 'bg-gray-100 text-gray-800 border-gray-300',
      expired: 'bg-red-100 text-red-800 border-red-300',
      cancelled: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };

    const labels = {
      active: '✓ Active',
      used: '✓ Used',
      expired: '✗ Expired',
      cancelled: '⊗ Cancelled',
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${badgeStyles[status as keyof typeof badgeStyles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getDiscountLabel = (discount: number, type: string) => {
    return type === 'percentage' ? `${discount}% Off` : `₹${discount} Off`;
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const daysUntilExpiry = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="w-full">
      {/* Real-time Connection Status */}
      {socketConnected && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-700 text-sm font-medium">Real-time sync enabled - Updates appear instantly</span>
        </div>
      )}

      {/* New Purchase Notification */}
      {newPurchaseNotification && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3 animate-slide-in">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">✓</div>
          <div>
            <p className="font-semibold text-blue-900">{newPurchaseNotification}</p>
            <p className="text-sm text-blue-700">Check your coupons below</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🎟️ My Purchased Coupons</h1>
        <p className="text-gray-600">View and manage your purchased coupon codes</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-gray-600 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
          <p className="text-gray-600 text-sm">Used</p>
          <p className="text-2xl font-bold text-gray-600">{stats.used}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-gray-600 text-sm">Expired</p>
          <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'active', 'used', 'expired'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              statusFilter === status
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Coupons List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4 w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {statusFilter === 'all' ? 'No Coupons Yet' : `No ${statusFilter} Coupons`}
          </h3>
          <p className="text-gray-600">
            {statusFilter === 'all'
              ? 'Purchase coupons to see them here'
              : `You don't have any ${statusFilter} coupons`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCoupons.map((coupon) => (
            <div key={coupon._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* Top Section */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{coupon.offerId.title}</h3>
                        <p className="text-sm text-gray-600">{coupon.vendorId.businessName}</p>
                      </div>
                    </div>

                    {/* Category and Details */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-700">
                        <Tag className="w-3 h-3 mr-1" />
                        {coupon.offerId.category}
                      </span>
                      {getStatusBadge(coupon.status)}
                    </div>
                  </div>

                  {/* Discount Badge */}
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {getDiscountLabel(coupon.discountValue, coupon.discountType)}
                    </p>
                    <p className="text-xs text-gray-500">You paid: ₹{coupon.platformSellingPrice}</p>
                  </div>
                </div>

                {/* Coupon Code Section */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-4 border border-purple-200">
                  <p className="text-xs text-gray-600 font-semibold mb-2">COUPON CODE</p>
                  <div className="flex items-center justify-between">
                    <code className="font-mono font-bold text-lg text-purple-600">{coupon.couponCode}</code>
                    <button
                      onClick={() => handleCopyCode(coupon.couponCode)}
                      className="ml-3 p-2 hover:bg-white rounded transition-colors"
                    >
                      {copiedCode === coupon.couponCode ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom Info */}
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 text-xs">Purchased</p>
                    <p className="font-semibold text-gray-900">{new Date(coupon.purchasedAt).toLocaleDateString()}</p>
                  </div>

                  <div>
                    <p className="text-gray-600 text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Expires
                    </p>
                    <p className="font-semibold text-gray-900">{new Date(coupon.expiryDate).toLocaleDateString()}</p>
                    {coupon.status === 'active' && !isExpired(coupon.expiryDate) && (
                      <p className={`text-xs ${daysUntilExpiry(coupon.expiryDate) <= 7 ? 'text-red-600' : 'text-gray-600'}`}>
                        {daysUntilExpiry(coupon.expiryDate)} days left
                      </p>
                    )}
                  </div>

                  {coupon.status === 'used' && coupon.usedAt && (
                    <div>
                      <p className="text-gray-600 text-xs">Used On</p>
                      <p className="font-semibold text-gray-900">{new Date(coupon.usedAt).toLocaleDateString()}</p>
                    </div>
                  )}

                  <div className="md:col-span-1">
                    <p className="text-gray-600 text-xs">Vendor Guide</p>
                    <Button className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 mt-1" size="sm">
                      How to Use
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      {filteredCoupons.length > 0 && filteredCoupons.some(coupon => coupon.status === 'active') && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-3">💡 How to Use Your Coupon</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li>1. Copy your coupon code using the copy button above</li>
            <li>2. Visit the vendor's store</li>
            <li>3. Show this coupon code to the vendor</li>
            <li>4. Vendor will validate and apply the discount to your purchase</li>
            <li>5. The coupon will be marked as "Used" in your account</li>
          </ol>
        </div>
      )}
    </div>
  );
}
