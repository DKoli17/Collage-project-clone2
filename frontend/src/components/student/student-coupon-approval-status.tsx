'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getMyPurchases } from '@/lib/couponAPI'

interface StudentCoupon {
  _id: string
  couponCode: string
  discountValue: number
  discountType: 'percentage' | 'fixed'
  platformSellingPrice: number
  purchasedAt: string
  expiryDate: string
  status: 'active' | 'used' | 'expired' | 'cancelled'
  vendorApprovalStatus: 'pending' | 'accepted' | 'rejected'
  adminApprovalStatus: 'pending' | 'approved' | 'rejected'
  vendorId: { _id: string; name: string; businessName: string }
  offerId: { _id: string; title: string; description: string }
}

export function StudentCouponApprovalStatus() {
  const [coupons, setCoupons] = useState<StudentCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchMyCoupons()
  }, [])

  const fetchMyCoupons = async () => {
    try {
      setLoading(true)
      const data = await getMyPurchases()
      if (data.success) {
        setCoupons(data.purchases || [])
      }
    } catch (error) {
      console.error('Error fetching coupons:', error)
      toast({
        title: 'Error',
        description: 'Failed to load your coupons',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading your coupons...</span>
      </div>
    )
  }

  const pendingAdminCoupons = coupons.filter((c) => c.adminApprovalStatus === 'pending')
  const approvedCoupons = coupons.filter((c) => c.adminApprovalStatus === 'approved')
  const rejectedCoupons = coupons.filter((c) => c.adminApprovalStatus === 'rejected')

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Your Coupon Status
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Track the status of your purchased coupons
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Admin Approval</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                  {pendingAdminCoupons.length}
                </p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved & Ready</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {approvedCoupons.length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {rejectedCoupons.length}
                </p>
              </div>
              <XCircle className="w-10 h-10 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Admin Approval Section */}
      {pendingAdminCoupons.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="text-yellow-900 dark:text-yellow-100">
              ⏳ Awaiting Admin Verification
            </CardTitle>
            <CardDescription className="text-yellow-800 dark:text-yellow-200">
              These coupons are waiting for admin approval. You can use them once they're approved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAdminCoupons.map((coupon) => (
                <div
                  key={coupon._id}
                  className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {coupon.offerId.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        From: {coupon.vendorId.businessName}
                      </p>
                    </div>
                    <Badge className="bg-yellow-600">Pending</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Discount</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {coupon.discountValue}
                        {coupon.discountType === 'percentage' ? '%' : '₹'} off
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Purchased</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {new Date(coupon.purchasedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 p-2 bg-gray-50 dark:bg-slate-700 rounded">
                    Coupon Code: <span className="font-mono font-bold">{coupon.couponCode}</span>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Section */}
      {approvedCoupons.length > 0 && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-100">
              ✅ Approved & Ready to Use
            </CardTitle>
            <CardDescription className="text-green-800 dark:text-green-200">
              These coupons have been verified by admin. You can use them at the vendor's store.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {approvedCoupons.map((coupon) => (
                <div
                  key={coupon._id}
                  className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-green-200 dark:border-green-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {coupon.offerId.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        From: {coupon.vendorId.businessName}
                      </p>
                    </div>
                    <Badge className="bg-green-600">Approved</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Discount</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {coupon.discountValue}
                        {coupon.discountType === 'percentage' ? '%' : '₹'} off
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Expires</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {new Date(coupon.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-mono font-bold">
                      Coupon Code: {coupon.couponCode}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Share this code with the vendor to claim your discount
                    </p>
                  </div>
                  {coupon.status === 'used' && (
                    <Badge className="mt-2 bg-blue-600">Already Used</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected Section */}
      {rejectedCoupons.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardHeader>
            <CardTitle className="text-red-900 dark:text-red-100">
              ❌ Rejected Coupons
            </CardTitle>
            <CardDescription className="text-red-800 dark:text-red-200">
              These coupons have been rejected and cannot be used. You may contact support for more information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rejectedCoupons.map((coupon) => (
                <div
                  key={coupon._id}
                  className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-red-200 dark:border-red-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {coupon.offerId.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        From: {coupon.vendorId.businessName}
                      </p>
                    </div>
                    <Badge className="bg-red-600">Rejected</Badge>
                  </div>
                  <p className="text-xs text-red-700 dark:text-red-300 p-2 bg-red-100 dark:bg-red-900/30 rounded mt-2">
                    This coupon cannot be used. Please contact support if you believe this is an error.
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {coupons.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">You haven't purchased any coupons yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Browse available coupons to get started
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default StudentCouponApprovalStatus
