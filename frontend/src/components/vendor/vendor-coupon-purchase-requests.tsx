import { useState, useEffect } from 'react';
import { ShoppingBag, ArrowRight, Loader, Bell, X, CheckCircle, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { getPendingCouponApprovals, acceptCouponPurchase, rejectCouponPurchase } from '@/lib/couponAPI';

interface CouponPurchaseRequest {
  _id: string;
  studentId: string;
  couponCode: string;
  offerId: string;
  platformSellingPrice: number;
  purchasedAt: string;
  expiryDate: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  vendorApprovalStatus: 'pending' | 'accepted' | 'rejected';
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  quantity: number;
}

export const VendorCouponPurchaseRequests = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CouponPurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Real-time notifications
  const { socket, isConnected: rtConnected } = useRealtimeNotifications({
    userType: 'vendor',
    userId: user?.id,
  });

  // Fetch pending approvals
  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const data = await getPendingCouponApprovals(50, 1);
      if (data.success) {
        setRequests(data.coupons || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending coupon approvals',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!rtConnected) {
      setIsConnected(false);
      return;
    }

    setIsConnected(true);

    // Listen for new coupon purchases
    socket?.on('coupon:sold', (data) => {
      console.log('New coupon sale received:', data);
      const newRequest: CouponPurchaseRequest = {
        _id: data.purchaseId || data._id || `${data.studentId}-${Date.now()}`,
        studentId: data.studentId || '',
        couponCode: data.couponCode || '',
        offerId: data.offerId || '',
        platformSellingPrice: data.platformSellingPrice || 0,
        purchasedAt: new Date().toISOString(),
        expiryDate: data.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        vendorApprovalStatus: 'pending',
        discountType: data.discountType || 'percentage',
        discountValue: data.discountValue || 0,
        quantity: data.quantity || 1,
      };
      setRequests((prev) => [newRequest, ...prev]);
    });

    // Join vendor room for real-time updates
    socket?.emit('vendor:join', user?.id);

    return () => {
      socket?.off('coupon:sold');
    };
  }, [rtConnected, socket, user?.id]);

  const handleAcceptCoupon = async (couponPurchaseId: string) => {
    try {
      setActionLoading(couponPurchaseId);
      const data = await acceptCouponPurchase(couponPurchaseId);
      
      if (data.success) {
        // Update local state
        setRequests((prev) =>
          prev.map((req) =>
            req._id === couponPurchaseId
              ? { ...req, vendorApprovalStatus: 'accepted' }
              : req
          )
        );

        toast({
          title: 'Success',
          description: `✅ Coupon accepted! Revenue of ₹${data.coupon?.revenueAdded} has been added to your account.`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to accept coupon',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error accepting coupon:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept coupon',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectCoupon = async (couponPurchaseId: string) => {
    try {
      setActionLoading(couponPurchaseId);
      const data = await rejectCouponPurchase(couponPurchaseId, rejectionReason);
      
      if (data.success) {
        // Update local state
        setRequests((prev) =>
          prev.map((req) =>
            req._id === couponPurchaseId
              ? { ...req, vendorApprovalStatus: 'rejected' }
              : req
          )
        );

        toast({
          title: 'Rejected',
          description: '❌ Coupon has been rejected.',
          variant: 'default',
        });
        setShowRejectDialog(null);
        setRejectionReason('');
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to reject coupon',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error rejecting coupon:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject coupon',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const totalRevenue = requests
    .filter((r) => r.vendorApprovalStatus === 'accepted')
    .reduce((sum, req) => sum + req.platformSellingPrice * req.quantity, 0);

  const pendingRequests = requests.filter((r) => r.vendorApprovalStatus === 'pending').length;
  const acceptedRequests = requests.filter((r) => r.vendorApprovalStatus === 'accepted').length;
  const rejectedRequests = requests.filter((r) => r.vendorApprovalStatus === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShoppingBag className="w-6 h-6" />
          Coupon Purchase Requests
          {isConnected && (
            <Badge className="ml-auto bg-green-600">
              <Bell className="w-3 h-3 mr-1" />
              Live
            </Badge>
          )}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Students have purchased coupons. Accept them to record revenue to your account.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingRequests}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Accepted</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{acceptedRequests}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{rejectedRequests}</p>
              </div>
              <ThumbsDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{totalRevenue}</p>
              </div>
              <ArrowRight className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Real-time updates not connected
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Live updates will appear when you connect to real-time notifications
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      {loading ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Loader className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 dark:text-gray-400 mt-2">Loading coupon requests...</p>
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-8">
            <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No coupon requests yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              New requests will appear here when students purchase coupons
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request._id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  {/* Request Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <ShoppingBag className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Coupon Code: {request.couponCode}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Discount: {request.discountValue}
                          {request.discountType === 'percentage' ? '%' : '₹'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={
                        request.vendorApprovalStatus === 'accepted'
                          ? 'bg-green-600'
                          : request.vendorApprovalStatus === 'rejected'
                            ? 'bg-red-600'
                            : 'bg-yellow-600'
                      }
                    >
                      {request.vendorApprovalStatus.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Request Details */}
                  <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Student ID:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{request.studentId.slice(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">₹{request.platformSellingPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                      <span>{request.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Purchased:</span>
                      <span>{new Date(request.purchasedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Expires:</span>
                      <span>{new Date(request.expiryDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {request.vendorApprovalStatus === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAcceptCoupon(request._id)}
                        disabled={actionLoading !== null}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === request._id ? (
                          <>
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Accept & Record Revenue
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setShowRejectDialog(request._id)}
                        disabled={actionLoading !== null}
                        variant="outline"
                        className="flex-1"
                      >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {request.vendorApprovalStatus === 'accepted' && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-sm text-green-700 dark:text-green-300">
                        ✅ Revenue of ₹{request.platformSellingPrice} has been added to your account
                      </p>
                    </div>
                  )}

                  {request.vendorApprovalStatus === 'rejected' && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded flex items-center gap-2">
                      <ThumbsDown className="w-5 h-5 text-red-600" />
                      <p className="text-sm text-red-700 dark:text-red-300">
                        ❌ This coupon has been rejected
                      </p>
                    </div>
                  )}

                  {/* Reject Dialog */}
                  {showRejectDialog === request._id && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-200 dark:border-red-800 space-y-3">
                      <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                        Why are you rejecting this coupon?
                      </p>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter rejection reason (optional)"
                        className="w-full px-3 py-2 border border-red-300 rounded text-sm dark:bg-slate-800 dark:border-red-700 dark:text-white"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleRejectCoupon(request._id)}
                          disabled={actionLoading !== null}
                          className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                          {actionLoading === request._id ? (
                            <>
                              <Loader className="w-4 h-4 mr-2 animate-spin" />
                              Rejecting...
                            </>
                          ) : (
                            'Confirm Rejection'
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowRejectDialog(null);
                            setRejectionReason('');
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
  );
};

export default VendorCouponPurchaseRequests;
