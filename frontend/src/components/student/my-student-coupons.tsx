import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStudentCoupons } from '@/lib/marketplaceAPI';
import { useToast } from '@/hooks/use-toast';
import { useSocketCouponSync } from '@/hooks/useSocketCouponSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader, Copy, Calendar, Zap } from 'lucide-react';

interface StudentCoupon {
  _id: string;
  code: string;
  vendorName: string;
  vendorLogo?: string;
  vendorCity?: string;
  amountPaid: number;
  issueDate: string;
  expiryDate: string;
  status: 'active' | 'used' | 'expired';
  daysRemaining: number;
  description?: string;
}

export const MyStudentCoupons = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [coupons, setCoupons] = useState<StudentCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'used' | 'expired'>('active');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Get user ID from localStorage
  const userStr = localStorage.getItem('user');
  const userId = userStr ? JSON.parse(userStr).id : null;

  // Initialize socket connection for real-time coupon updates
  const { isConnected, newCoupons } = useSocketCouponSync('student', userId);

  useEffect(() => {
    fetchCoupons();
  }, [activeTab]);

  // Handle real-time coupon updates
  useEffect(() => {
    if (newCoupons && newCoupons.length > 0) {
      const latestCoupon = newCoupons[0];
      
      // Only add to active coupons if relevant
      if (activeTab === 'active' && latestCoupon.status === 'active') {
        setCoupons((prev) => {
          const exists = prev.some((c) => c._id === latestCoupon._id);
          if (!exists) {
            toast({
              title: '🎉 New Coupon!',
              description: `New coupon from ${latestCoupon.vendorName} has been added to your active coupons!`,
            });
            return [
              {
                _id: latestCoupon._id,
                code: latestCoupon.code,
                vendorName: latestCoupon.vendorName,
                amountPaid: latestCoupon.amountPaid,
                issueDate: latestCoupon.issueDate,
                expiryDate: latestCoupon.expiryDate,
                status: latestCoupon.status as 'active' | 'used' | 'expired',
                daysRemaining: Math.ceil(
                  (new Date(latestCoupon.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                ),
                description: latestCoupon.description,
              },
              ...prev,
            ];
          }
          return prev;
        });
      }
    }
  }, [newCoupons, activeTab, toast]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await getStudentCoupons({
        status: activeTab,
        page: 1,
        limit: 20,
      });

      setCoupons(response.coupons || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your coupons. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: 'Copied!',
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'used':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getExpiryColor = (daysRemaining: number) => {
    if (daysRemaining <= 0) return 'text-red-600 dark:text-red-400';
    if (daysRemaining <= 7) return 'text-amber-600 dark:text-amber-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              My Coupons
            </h1>
            {/* Real-time connection status */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className={`text-sm font-medium ${isConnected ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {isConnected ? '🔴 Live' : '⚪ Offline'}
              </span>
            </div>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Manage your generated coupons and redemptions
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-8">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="used">Used</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}

          {/* Active Coupons Tab */}
          <TabsContent value="active">
            {!loading && (
              <>
                {coupons.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {coupons.map((coupon) => (
                      <Card
                        key={coupon._id}
                        className="hover:shadow-lg transition-shadow overflow-hidden"
                      >
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Vendor Info */}
                            <div className="md:col-span-2 space-y-3">
                              {coupon.vendorLogo && (
                                <img
                                  src={coupon.vendorLogo}
                                  alt={coupon.vendorName}
                                  className="h-12 w-auto object-contain rounded"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                  {coupon.vendorName}
                                </h3>
                                {coupon.vendorCity && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    📍 {coupon.vendorCity}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Coupon Code */}
                            <div className="md:col-span-2 space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                                  Coupon Code
                                </p>
                                <div className="flex items-center gap-2">
                                  <code className="text-xl font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded font-mono">
                                    {coupon.code}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCopyCode(coupon.code)}
                                    className={
                                      copiedCode === coupon.code
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : ''
                                    }
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Details Row */}
                          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Status */}
                            <div>
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                Status
                              </p>
                              <Badge className={`mt-2 capitalize ${getStatusColor(coupon.status)}`}>
                                {coupon.status}
                              </Badge>
                            </div>

                            {/* Amount */}
                            <div>
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                Amount
                              </p>
                              <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                                ₹{coupon.amountPaid}
                              </p>
                            </div>

                            {/* Issue Date */}
                            <div>
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                Issued
                              </p>
                              <p className="text-sm text-gray-900 dark:text-white">
                                {new Date(coupon.issueDate).toLocaleDateString()}
                              </p>
                            </div>

                            {/* Expiry */}
                            <div>
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                                Expires In
                              </p>
                              <p className={`text-sm font-semibold ${getExpiryColor(coupon.daysRemaining)}`}>
                                {coupon.daysRemaining > 0
                                  ? `${coupon.daysRemaining} day${coupon.daysRemaining !== 1 ? 's' : ''}`
                                  : 'Expired'}
                              </p>
                            </div>
                          </div>

                          {/* Instructions */}
                          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                              📋 Redemption Instructions:
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              Present this coupon code at {coupon.vendorName} to claim your
                              offer. The code has been generated for the amount ₹{coupon.amountPaid}{' '}
                              paid on {new Date(coupon.issueDate).toLocaleDateString()}.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>No Active Coupons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        You don't have any active coupons yet. Start exploring vendors to
                        generate your first coupon!
                      </p>
                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => navigate('/student/marketplace')}
                      >
                        Browse Vendors
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Used Coupons Tab */}
          <TabsContent value="used">
            {!loading && (
              <>
                {coupons.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {coupons.map((coupon) => (
                      <Card key={coupon._id}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 dark:text-white">
                                {coupon.vendorName} - {coupon.code}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Amount: ₹{coupon.amountPaid} • Issued:{' '}
                                {new Date(coupon.issueDate).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="secondary">Used</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>No Used Coupons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-400">
                        You haven't redeemed any coupons yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Expired Coupons Tab */}
          <TabsContent value="expired">
            {!loading && (
              <>
                {coupons.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {coupons.map((coupon) => (
                      <Card key={coupon._id} className="opacity-75">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 dark:text-white">
                                {coupon.vendorName} - {coupon.code}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Amount: ₹{coupon.amountPaid} • Expired:{' '}
                                {new Date(coupon.expiryDate).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="destructive">Expired</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>No Expired Coupons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-400">
                        All your coupons are still valid!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyStudentCoupons;
