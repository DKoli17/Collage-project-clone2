import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getAdminPendingCouponPurchases, approveCouponPurchase, adminRejectCouponPurchase } from '@/lib/couponAPI'

interface CouponPurchase {
  _id: string
  couponCode: string
  studentId: {
    _id: string
    name: string
    email: string
    enrollmentNumber: string
    collegeName: string
  }
  vendorId: {
    _id: string
    name: string
    businessName: string
  }
  offerId: {
    _id: string
    title: string
    description: string
    discountValue: number
  }
  platformSellingPrice: number
  discountType: 'percentage' | 'fixed'
  discountValue: number
  purchasedAt: string
  expiryDate: string
  adminApprovalStatus: 'pending' | 'approved' | 'rejected'
  vendorApprovalStatus: 'pending' | 'accepted' | 'rejected'
  status: string
  quantity: number
}

export function AdminCouponPurchaseApproval() {
  const [coupons, setCoupons] = useState<CouponPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string>('')
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null)
  const [approvalRemarks, setApprovalRemarks] = useState<string>('')
  const [showApprovalDialog, setShowApprovalDialog] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>('pending')
  const { toast } = useToast()

  useEffect(() => {
    fetchCouponPurchases()
  }, [filterStatus])

  const fetchCouponPurchases = async () => {
    try {
      setLoading(true)
      const data =
        filterStatus === 'pending'
          ? await getAdminPendingCouponPurchases(50, 1)
          : await getAdminPendingCouponPurchases(500, 1)

      if (data.success) {
        setCoupons(data.coupons)
      }
    } catch (error) {
      console.error('Error fetching coupons:', error)
      toast({
        title: 'Error',
        description: 'Failed to load coupon purchases',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (couponId: string) => {
    try {
      setActionLoading(couponId)
      const data = await approveCouponPurchase(couponId, approvalRemarks)

      if (data.success) {
        setCoupons((prev) =>
          prev.map((c) =>
            c._id === couponId
              ? { ...c, adminApprovalStatus: 'approved' }
              : c
          )
        )
        toast({
          title: 'Approved',
          description: '✅ Coupon has been approved. Student can now use it.',
        })
        setShowApprovalDialog(null)
        setApprovalRemarks('')
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to approve coupon',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error approving:', error)
      toast({
        title: 'Error',
        description: 'Failed to approve coupon',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (couponId: string) => {
    try {
      setActionLoading(couponId)
      const data = await adminRejectCouponPurchase(couponId, rejectionReason)

      if (data.success) {
        setCoupons((prev) =>
          prev.map((c) =>
            c._id === couponId
              ? { ...c, adminApprovalStatus: 'rejected' }
              : c
          )
        )
        toast({
          title: 'Rejected',
          description: '❌ Coupon has been rejected.',
        })
        setShowRejectDialog(null)
        setRejectionReason('')
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to reject coupon',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error rejecting:', error)
      toast({
        title: 'Error',
        description: 'Failed to reject coupon',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const pendingCount = coupons.filter((c) => c.adminApprovalStatus === 'pending').length
  const approvedCount = coupons.filter((c) => c.adminApprovalStatus === 'approved').length
  const rejectedCount = coupons.filter((c) => c.adminApprovalStatus === 'rejected').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading coupon purchases...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Coupon Purchase Verification</h2>
        <p className="text-gray-600">
          Review and approve/reject student coupon purchases. Approved coupons can be used by students.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingCount}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{approvedCount}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{rejectedCount}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{coupons.length}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          onClick={() => setFilterStatus('pending')}
          variant={filterStatus === 'pending' ? 'default' : 'outline'}
        >
          Pending
        </Button>
        <Button
          onClick={() => setFilterStatus('all')}
          variant={filterStatus === 'all' ? 'default' : 'outline'}
        >
          All
        </Button>
      </div>

      {/* List */}
      {coupons.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-8">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {filterStatus === 'pending'
                ? 'No pending coupon purchases to review'
                : 'No coupon purchases found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <Card key={coupon._id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {coupon.studentId.name} → {coupon.vendorId.businessName}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Coupon: <span className="font-mono font-bold">{coupon.couponCode}</span>
                      </p>
                    </div>
                    <Badge
                      className={
                        coupon.adminApprovalStatus === 'approved'
                          ? 'bg-green-600'
                          : coupon.adminApprovalStatus === 'rejected'
                            ? 'bg-red-600'
                            : 'bg-yellow-600'
                      }
                    >
                      {coupon.adminApprovalStatus === 'pending'
                        ? '⏳ Pending'
                        : coupon.adminApprovalStatus === 'approved'
                          ? '✅ Approved'
                          : '❌ Rejected'}
                    </Badge>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">Student</p>
                      <p className="text-sm font-medium text-gray-900">{coupon.studentId.name}</p>
                      <p className="text-xs text-gray-600">{coupon.studentId.email}</p>
                      <p className="text-xs text-gray-600">{coupon.studentId.collegeName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">Offer</p>
                      <p className="text-sm font-medium text-gray-900">{coupon.offerId.title}</p>
                      <p className="text-sm font-bold text-blue-600">
                        {coupon.discountValue}
                        {coupon.discountType === 'percentage' ? '%' : '₹'} off
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase">Amount</p>
                      <p className="text-sm font-medium text-gray-900">
                        ₹{coupon.platformSellingPrice}
                      </p>
                      <p className="text-xs text-gray-600">
                        Purchased: {new Date(coupon.purchasedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Vendor & Status Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-xs font-semibold text-blue-900">Vendor Status</p>
                      <Badge
                        className={
                          coupon.vendorApprovalStatus === 'accepted'
                            ? 'bg-green-100 text-green-800 mt-1 inline-block'
                            : coupon.vendorApprovalStatus === 'rejected'
                              ? 'bg-red-100 text-red-800 mt-1 inline-block'
                              : 'bg-yellow-100 text-yellow-800 mt-1 inline-block'
                        }
                        variant="secondary"
                      >
                        {coupon.vendorApprovalStatus}
                      </Badge>
                    </div>
                    <div className="bg-purple-50 p-2 rounded">
                      <p className="text-xs font-semibold text-purple-900">Coupon Status</p>
                      <Badge
                        className={
                          coupon.status === 'active'
                            ? 'bg-blue-100 text-blue-800 mt-1 inline-block'
                            : coupon.status === 'used'
                              ? 'bg-green-100 text-green-800 mt-1 inline-block'
                              : 'bg-gray-100 text-gray-800 mt-1 inline-block'
                        }
                        variant="secondary"
                      >
                        {coupon.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Approval/Rejection Reason (if applicable) */}
                  {coupon.adminApprovalStatus === 'approved' && (
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <p className="text-sm text-green-900">
                        ✅ <strong>Approved</strong> - Student can now use this coupon
                      </p>
                    </div>
                  )}

                  {coupon.adminApprovalStatus === 'rejected' && (
                    <div className="bg-red-50 p-3 rounded border border-red-200">
                      <p className="text-sm text-red-900">
                        ❌ <strong>Rejected</strong> - Coupon cannot be used
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {coupon.adminApprovalStatus === 'pending' && (
                    <div className="space-y-3 border-t pt-3">
                      {/* Approval Dialog */}
                      {showApprovalDialog === coupon._id && (
                        <div className="bg-green-50 p-3 rounded border border-green-200 space-y-2">
                          <textarea
                            value={approvalRemarks}
                            onChange={(e) => setApprovalRemarks(e.target.value)}
                            placeholder="Add approval remarks (optional)"
                            className="w-full px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-gray-700"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApprove(coupon._id)}
                              disabled={actionLoading !== null}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-sm h-8"
                            >
                              {actionLoading === coupon._id ? (
                                <>
                                  <Loader className="w-3 h-3 mr-1 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Confirm Approval
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setShowApprovalDialog(null)
                                setApprovalRemarks('')
                              }}
                              variant="outline"
                              className="flex-1 text-sm h-8"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                      {/* Rejection Dialog */}
                      {showRejectDialog === coupon._id && (
                        <div className="bg-red-50 p-3 rounded border border-red-200 space-y-2">
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Why are you rejecting this coupon?"
                            className="w-full px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-gray-700"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReject(coupon._id)}
                              disabled={actionLoading !== null || !rejectionReason.trim()}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-sm h-8"
                            >
                              {actionLoading === coupon._id ? (
                                <>
                                  <Loader className="w-3 h-3 mr-1 animate-spin" />
                                  Rejecting...
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Confirm Rejection
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setShowRejectDialog(null)
                                setRejectionReason('')
                              }}
                              variant="outline"
                              className="flex-1 text-sm h-8"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Show action buttons only if not in dialog mode */}
                      {showApprovalDialog !== coupon._id && showRejectDialog !== coupon._id && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setShowApprovalDialog(coupon._id)}
                            disabled={actionLoading !== null}
                            className="flex-1 bg-green-600 hover:bg-green-700 h-8"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => setShowRejectDialog(coupon._id)}
                            disabled={actionLoading !== null}
                            variant="outline"
                            className="flex-1 h-8"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminCouponPurchaseApproval
