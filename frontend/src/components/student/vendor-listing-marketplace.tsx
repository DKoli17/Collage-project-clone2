import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllVendors } from '@/lib/marketplaceAPI';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader } from 'lucide-react';

interface Vendor {
  _id: string;
  name: string;
  businessName: string;
  businessLogo?: string;
  businessDescription?: string;
  city?: string;
  locality?: string;
  availableOffers: number;
  offers?: any[];
}

export const VendorListingMarketplace = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
  }, [page, searchQuery]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await getAllVendors({
        search: searchQuery || undefined,
        page,
        limit: 12,
      });

      setVendors(response.vendors);
      setTotalPages(response.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vendors. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVendorClick = (vendorId: string) => {
    navigate(`/student/marketplace/vendor/${vendorId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Browse Vendors & Coupons
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Discover exclusive deals from verified vendors in your area
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <Input
            placeholder="Search vendors by name or business type..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full max-w-md h-12 text-base"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Vendors Grid */}
        {!loading && (
          <>
            {vendors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {vendors.map((vendor) => (
                  <Card
                    key={vendor._id}
                    className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                    onClick={() => handleVendorClick(vendor._id)}
                  >
                    {/* Logo Section */}
                    {vendor.businessLogo && (
                      <div className="h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                        <img
                          src={vendor.businessLogo}
                          alt={vendor.businessName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-logo.png';
                          }}
                        />
                      </div>
                    )}

                    <CardHeader>
                      <CardTitle className="text-xl">{vendor.businessName || vendor.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {vendor.businessDescription || 'Quality deals and discounts'}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-4">
                        {/* Location */}
                        {(vendor.city || vendor.locality) && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            📍 {[vendor.locality, vendor.city].filter(Boolean).join(', ')}
                          </div>
                        )}

                        {/* Available Offers Badge */}
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-base py-1 px-3">
                            {vendor.availableOffers} Offer{vendor.availableOffers !== 1 ? 's' : ''}
                          </Badge>
                        </div>

                        {/* Coupon Discounts Preview */}
                        {vendor.offers && vendor.offers.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Available Discounts:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {vendor.offers.slice(0, 3).map((offer, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200"
                                >
                                  {offer.discount}
                                  {offer.discountType === 'percentage' ? '%' : '₹'} off
                                </Badge>
                              ))}
                              {vendor.offers.length > 3 && (
                                <Badge variant="outline">
                                  +{vendor.offers.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* View Details Button */}
                        <Button
                          className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVendorClick(vendor._id);
                          }}
                        >
                          View Details & Offers
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  No vendors found. Try a different search!
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VendorListingMarketplace;
