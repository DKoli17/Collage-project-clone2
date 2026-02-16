import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../lib/api';
import { useRealtimeStudentCoupons } from '../../hooks/useRealtimeStudentCoupons';

interface Offer {
  _id: string;
  title: string;
  description: string;
  category: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  platformSellingPrice: number;
  vendor: {
    _id: string;
    name: string;
    businessName: string;
    email: string;
  };
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

interface CouponBrowserProps {
  onSelectOffer: (offer: Offer) => void;
}

export function CouponBrowser({ onSelectOffer }: CouponBrowserProps) {
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [socketConnected, setSocketConnected] = useState(false);

  const categories = [
    'all',
    'food',
    'retail',
    'entertainment',
    'technology',
    'travel',
    'education',
    'health',
    'sports',
  ];

  // Real-time coupon updates
  useRealtimeStudentCoupons(
    (purchase) => {
      console.log('🎉 Purchase success notification received:', purchase);
      // The purchase success will be handled by the purchase dialog component
    },
    (redeemed) => {
      console.log('✅ Coupon redeemed notification:', redeemed);
      // Refresh offers to update availability
      fetchOffers();
    },
    (availability) => {
      console.log('📊 Availability changed:', availability);
      // Update offers when availability changes
      // Note: offers availability update logic could be added here if needed
    },
    setSocketConnected
  );

  // Fetch available offers
  const fetchOffers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '12',
        page: page.toString(),
      });

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      if (search) {
        params.append('search', search);
      }

      const response = await api.get(`/coupon-purchase/available-offers?${params}`);
      setFilteredOffers(response.data.offers);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch offers:', error);
      setFilteredOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [selectedCategory, search, page]);

  const getDiscountLabel = (discount: number, type: string) => {
    return type === 'percentage' ? `${discount}%` : `₹${discount}`;
  };

  return (
    <div className="w-full">
      {/* Real-time Connection Status */}
      {socketConnected && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-700 text-sm font-medium">Real-time updates enabled</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🎟️ Available Coupons</h1>
        <p className="text-gray-600">Browse and purchase exclusive discounts from vendors</p>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search coupons, vendors..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Offers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Coupons Found</h3>
          <p className="text-gray-600">Try adjusting your filters or search term</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredOffers.map((offer) => (
              <div
                key={offer._id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Header with category */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{offer.title}</h3>
                      <p className="text-sm opacity-90">{offer.vendor.businessName}</p>
                    </div>
                    <span className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs font-semibold">
                      {offer.category}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4">
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{offer.description}</p>

                  {/* Discount Badge */}
                  <div className="bg-yellow-50 rounded-lg p-3 mb-4 border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-600">
                      {getDiscountLabel(offer.discount, offer.discountType)}
                      <span className="text-sm ml-2 font-normal text-gray-600">
                        {offer.discountType === 'percentage' ? 'off' : 'discount'}
                      </span>
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">You Pay:</span>
                      <span className="text-xl font-bold text-green-600">₹{offer.platformSellingPrice}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Original: ₹{offer.discount}
                    </p>
                  </div>

                  {/* Vendor Info */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{offer.vendor.businessName}</span>
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => onSelectOffer(offer)}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 rounded-lg"
                  >
                    Buy Coupon
                  </Button>
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
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`px-3 py-2 rounded-lg ${
                      page === i + 1
                        ? 'bg-purple-500 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </Button>
                ))}
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
    </div>
  );
}
