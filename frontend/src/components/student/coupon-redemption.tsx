import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Copy, 
  Calendar, 
  MapPin, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  QrCode,
  Smartphone
} from 'lucide-react';

interface PurchasedCoupon {
  _id: string;
  couponCode: string;
  offerId: {
    _id: string;
    title: string;
    category: string;
    discount: number;
    discountType: 'percentage' | 'fixed';
  };
  vendorId: {
    _id: string;
    name: string;
    businessName: string;
    businessAddress: string;
    city: string;
    mobileNumber: string;
  };
  status: 'active' | 'used' | 'expired' | 'cancelled';
  expiryDate: string;
  platformSellingPrice: number;
  originalValue: number;
  purchasedAt: string;
  usedAt?: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
}

export function CouponRedemption() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [allCoupons, setAllCoupons] = useState<PurchasedCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'used' | 'expired'>('active');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<PurchasedCoupon | null>(null);
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);

  useEffect(() => {
    fetchAllCoupons();
  }, []);

  const fetchAllCoupons = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/student/login');
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(
        `${apiUrl}/coupon-purchase/my-purchases?limit=100&page=1`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch coupons');
      }

      const data = await response.json();
      setAllCoupons(data.purchases || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your purchased coupons. Please try again.',
        variant: 'destructive',
      });
      setAllCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const coupons = allCoupons.filter(c => c.status === activeTab);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: '✅ Copied!',
        description: 'Coupon code copied to clipboard',
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy code',
        variant: 'destructive',
      });
    }
  };

  const handleRedeemClick = (coupon: PurchasedCoupon) => {
    setSelectedCoupon(coupon);
    setShowRedemptionModal(true);
  };

  const handleShowQRCode = (coupon: PurchasedCoupon) => {
    toast({
      title: '📱 QR Code',
      description: `Show this coupon code to the vendor: ${coupon.couponCode}`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysRemaining = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getExpiryColor = (daysRemaining: number) => {
    if (daysRemaining <= 0) return 'text-red-600';
    if (daysRemaining <= 3) return 'text-orange-600';
    if (daysRemaining <= 7) return 'text-amber-600';
    return 'text-green-600';
  };

  const getDiscountDisplay = (coupon: PurchasedCoupon) => {
    const { discount, discountType } = coupon.offerId;
    return discountType === 'percentage' ? `${discount}%` : `₹${discount}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading your coupons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🎟️ My Purchased Coupons</h1>
          <p className="text-gray-600 text-lg">
            Manage your redeemable coupon codes and track their status
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-md p-2 rounded-lg mb-8">
            <TabsTrigger value="active" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
              <CheckCircle className="w-4 h-4 mr-2" />
              Active ({allCoupons.filter(c => c.status === 'active').length})
            </TabsTrigger>
            <TabsTrigger value="used" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <CheckCircle className="w-4 h-4 mr-2" />
              Redeemed ({allCoupons.filter(c => c.status === 'used').length})
            </TabsTrigger>
            <TabsTrigger value="expired" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
              <AlertCircle className="w-4 h-4 mr-2" />
              Expired ({allCoupons.filter(c => c.status === 'expired').length})
            </TabsTrigger>
          </TabsList>

          {/* Active Coupons */}
          <TabsContent value="active">
            {coupons.length === 0 ? (
              <Card className="bg-white border-2 border-dashed border-green-300">
                <CardContent className="pt-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Coupons</h3>
                  <p className="text-gray-600 mb-6">You don't have any active coupons yet. Browse vendors and purchase a coupon!</p>
                  <Button 
                    onClick={() => navigate('/student/vendors')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  >
                    Browse Vendors
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon) => (
                  <Card key={coupon._id} className="hover:shadow-lg transition-all border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-gray-900 mb-1">
                            {coupon.offerId.title}
                          </CardTitle>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {coupon.vendorId.businessName}
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(coupon.status)}`}>
                          {coupon.status === 'active' ? '✓ Active' : coupon.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Discount Display */}
                      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 border border-orange-200">
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Discount Value</p>
                          <p className="text-3xl font-bold text-orange-600">
                            {getDiscountDisplay(coupon)}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            You Paid: ₹{coupon.platformSellingPrice}
                          </p>
                        </div>
                      </div>

                      {/* Coupon Code */}
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-2">Coupon Code</p>
                        <div className="flex items-center justify-between gap-2">
                          <code className="flex-1 font-mono font-bold text-gray-900 text-center text-lg tracking-wider">
                            {coupon.couponCode}
                          </code>
                          <button
                            onClick={() => handleCopyCode(coupon.couponCode)}
                            className={`p-2 rounded-lg transition-all ${
                              copiedCode === coupon.couponCode
                                ? 'bg-green-500 text-white'
                                : 'bg-white border border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Vendor Info */}
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-900 font-medium">{coupon.vendorId.city}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Smartphone className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-900">{coupon.vendorId.mobileNumber}</span>
                        </div>
                      </div>

                      {/* Expiry Date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            Expires in {getDaysRemaining(coupon.expiryDate)} days
                          </span>
                        </div>
                        <span className={`text-sm font-semibold ${getExpiryColor(getDaysRemaining(coupon.expiryDate))}`}>
                          {new Date(coupon.expiryDate).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleRedeemClick(coupon)}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Redeem
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleShowQRCode(coupon)}
                          className="flex-1"
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Show Code
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Redeemed Coupons */}
          <TabsContent value="used">
            {coupons.length === 0 ? (
              <Card className="bg-white border-2 border-dashed border-blue-300">
                <CardContent className="pt-12 text-center">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Redeemed Coupons</h3>
                  <p className="text-gray-600">You haven't redeemed any coupons yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon) => (
                  <Card key={coupon._id} className="hover:shadow-lg transition-all border-l-4 border-l-blue-500 opacity-75">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-gray-900 mb-1">
                            {coupon.offerId.title}
                          </CardTitle>
                          <p className="text-sm text-gray-600">
                            {coupon.vendorId.businessName}
                          </p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">✓ Used</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        Redeemed on: <span className="font-semibold">{new Date(coupon.usedAt || '').toLocaleDateString()}</span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Expired Coupons */}
          <TabsContent value="expired">
            {coupons.length === 0 ? (
              <Card className="bg-white border-2 border-dashed border-red-300">
                <CardContent className="pt-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Expired Coupons</h3>
                  <p className="text-gray-600">All your coupons are still valid!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon) => (
                  <Card key={coupon._id} className="hover:shadow-lg transition-all border-l-4 border-l-red-500 opacity-60">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-gray-900 mb-1 line-through">
                            {coupon.offerId.title}
                          </CardTitle>
                          <p className="text-sm text-gray-600">
                            {coupon.vendorId.businessName}
                          </p>
                        </div>
                        <Badge className="bg-red-100 text-red-800">Expired</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        Expired on: <span className="font-semibold">{new Date(coupon.expiryDate).toLocaleDateString()}</span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Redemption Modal */}
        {showRedemptionModal && selectedCoupon && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>Redeem Your Coupon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-2">Coupon Code:</p>
                  <code className="text-2xl font-bold tracking-wider">{selectedCoupon.couponCode}</code>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Visit Vendor Location:</h4>
                  <p className="text-sm text-gray-700 mb-2">📍 {selectedCoupon.vendorId.businessName}</p>
                  <p className="text-sm text-gray-700 mb-2">{selectedCoupon.vendorId.businessAddress}</p>
                  <p className="text-sm text-gray-700">📞 {selectedCoupon.vendorId.mobileNumber}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600"><strong>Instructions:</strong></p>
                  <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Visit the vendor location</li>
                    <li>Show this coupon code to the vendor</li>
                    <li>Vendor will verify and process your discount</li>
                    <li>Your coupon will be marked as redeemed</li>
                  </ol>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleCopyCode(selectedCoupon.couponCode)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </Button>
                  <Button
                    onClick={() => setShowRedemptionModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
