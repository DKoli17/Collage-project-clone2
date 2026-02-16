import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVendorDetails } from '@/lib/marketplaceAPI';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader, ArrowLeft, MapPin, Package } from 'lucide-react';

interface VendorDetail {
  _id: string;
  name: string;
  businessName: string;
  businessLogo?: string;
  businessDescription?: string;
  city?: string;
  locality?: string;
  businessType?: string;
  offers: any[];
}

export const VendorDetailsPage = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendorDetails();
  }, [vendorId]);

  const fetchVendorDetails = async () => {
    try {
      setLoading(true);
      if (!vendorId) {
        throw new Error('Vendor ID not found');
      }
      const response = await getVendorDetails(vendorId);
      setVendor(response.vendor);
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vendor details. Please try again.',
        variant: 'destructive',
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCoupon = (offerId?: string) => {
    if (!vendorId) return;
    navigate(`/student/marketplace/generate-coupon`, {
      state: {
        vendorId,
        vendorName: vendor?.businessName || vendor?.name,
        offerId,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Vendor Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6 pl-0"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Vendors
        </Button>

        {/* Vendor Header Card */}
        <Card className="mb-8 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {/* Logo Section */}
            {vendor.businessLogo && (
              <div className="md:col-span-1 h-64 md:h-auto bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
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

            {/* Info Section */}
            <div className={`${vendor.businessLogo ? 'md:col-span-2' : 'md:col-span-3'} p-6`}>
              <div className="space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {vendor.businessName || vendor.name}
                  </h1>
                  {vendor.businessType && (
                    <Badge variant="secondary" className="mb-3">
                      {vendor.businessType}
                    </Badge>
                  )}
                </div>

                {vendor.businessDescription && (
                  <p className="text-gray-700 dark:text-gray-300">
                    {vendor.businessDescription}
                  </p>
                )}

                {/* Location */}
                {(vendor.city || vendor.locality) && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 mr-2" />
                    {[vendor.locality, vendor.city].filter(Boolean).join(', ')}
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Package className="w-4 h-4 mr-2" />
                  {vendor.offers?.length || 0} Available Offer{
                    vendor.offers?.length !== 1 ? 's' : ''
                  }
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Available Offers Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Available Offers
          </h2>

          {vendor.offers && vendor.offers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vendor.offers.map((offer, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      {offer.discount}{offer.discountType === 'percentage' ? '%' : '₹'} OFF
                    </CardTitle>
                    <CardDescription>{offer.description}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      {/* Original Price */}
                      {offer.originalPrice && (
                        <div className="flex items-baseline gap-3">
                          <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            ₹{offer.discountedPrice || offer.originalPrice}
                          </span>
                          <span className="text-lg text-gray-400 line-through">
                            ₹{offer.originalPrice}
                          </span>
                        </div>
                      )}

                      {/* Category */}
                      {offer.category && (
                        <Badge variant="outline">{offer.category}</Badge>
                      )}

                      {/* Instructions */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded text-sm text-blue-900 dark:text-blue-100">
                        <p className="font-semibold mb-2">How it works:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Pay directly at the vendor</li>
                          <li>Come back and generate your coupon code</li>
                          <li>Get your discount confirmed</li>
                        </ol>
                      </div>

                      {/* Generate Coupon Button */}
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handleGenerateCoupon(offer._id)}
                      >
                        Generate Coupon for This Offer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Offers Available</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  This vendor currently has no available offers. Please check back later.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Generate Coupon Card */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle>Generate Coupon for Any Amount</CardTitle>
            <CardDescription>
              Pay any amount directly at the vendor and generate your coupon code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full md:w-auto bg-green-600 hover:bg-green-700"
              onClick={() => handleGenerateCoupon()}
            >
              Generate Custom Coupon
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorDetailsPage;
