'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Search, Download, Loader2, TrendingUp, Users, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useSocketCouponSync } from '@/hooks/useSocketCouponSync'

interface CouponPurchase {
  _id: string
  couponCode: string
  studentId: {
    _id: string
    name: string
    email: string
  }
  offerId: {
    _id: string
    title: string
  }
  discountType: 'percentage' | 'fixed'
  discountValue: number
  originalValue: number
  platformSellingPrice: number
  purchasedAt: string
  expiryDate: string
  status: 'active' | 'used' | 'expired' | 'cancelled'
  vendorApprovalStatus: 'pending' | 'accepted' | 'rejected'
}

export const VendorCouponPurchases = () => {
  const { toast } = useToast()
  const [purchases, setPurchases] = useState<CouponPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Get vendor ID from localStorage
  const userStr = localStorage.getItem('user')
  const vendorId = userStr ? JSON.parse(userStr).id : null

  // Initialize socket connection for real-time coupon updates
  const { isConnected, newCoupons } = useSocketCouponSync('vendor', vendorId)

  // Fetch coupon purchases
  const fetchPurchases = async (pageNum: number = 1) => {
    try {
      setLoading(true)
      const query = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(searchTerm && { search: searchTerm }),
      })

      const response = await fetch(
        `/api/vendor/coupon-purchases?${query}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid response content type:', contentType)
        throw new Error('Server returned non-JSON response. Backend server may not be running.')
      }

      const data = await response.json()
      if (data.success) {
        setPurchases(data.purchases || [])
        setTotalPages(data.totalPages || 1)
        setTotalCount(data.total || 0)
      } else {
        throw new Error(data.message || 'Failed to fetch coupon purchases')
      }
    } catch (error) {
      console.error('Error fetching purchases:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load coupon purchases',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPurchases(1)
    setPage(1)
  }, [filterStatus, searchTerm])

  useEffect(() => {
    fetchPurchases(page)
  }, [page])

  // Handle real-time coupon creation updates
  useEffect(() => {
    if (newCoupons && newCoupons.length > 0) {
      const latestCoupon = newCoupons[0]

      // Check if this coupon belongs to this vendor
      if (latestCoupon.vendorId === vendorId) {
        // Increment total count
        setTotalCount((prev) => prev + 1)

        // Show toast notification
        toast({
          title: '🎟️ New Coupon Created!',
          description: `New coupon ${latestCoupon.code} from student for ₹${latestCoupon.amountPaid}`,
        })

        console.log('📊 Vendor received new coupon in real-time:', latestCoupon)
      }
    }
  }, [newCoupons, vendorId, toast])

  const handleExport = () => {
    const csv = [
      ['Coupon Code', 'Student Name', 'Student Email', 'Offer', 'Discount', 'Price', 'Purchased Date', 'Status'],
      ...purchases.map(p => [
        p.couponCode,
        p.studentId.name,
        p.studentId.email,
        p.offerId.title,
        `${p.discountType === 'percentage' ? p.discountValue + '%' : '₹' + p.discountValue}`,
        `₹${p.platformSellingPrice}`,
        new Date(p.purchasedAt).toLocaleDateString(),
        p.status,
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `coupon-purchases-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'used':
        return 'bg-blue-100 text-blue-800'
      case 'expired':
        return 'bg-gray-100 text-gray-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3 flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">Total Purchases</CardTitle>
            {/* Real-time connection status */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className={`text-xs font-medium ${isConnected ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{totalCount}</div>
              <ShoppingCart className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {new Set(purchases.map(p => p.studentId._id)).size}
              </div>
              <Users className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                ₹{purchases.reduce((sum, p) => sum + p.platformSellingPrice, 0).toLocaleString()}
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Coupon Purchases</CardTitle>
          <CardDescription>View all student coupon purchases from your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by code, name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="used">Used</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto opacity-30 mb-2" />
              <p>No coupon purchases found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Coupon Code</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Student</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Offer</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Discount</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700">Price</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Purchased</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {purchase.couponCode}
                        </code>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-gray-900">{purchase.studentId.name}</p>
                          <p className="text-xs text-gray-500">{purchase.studentId.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{purchase.offerId.title}</td>
                      <td className="py-3 px-2">
                        {purchase.discountType === 'percentage'
                          ? `${purchase.discountValue}%`
                          : `₹${purchase.discountValue}`}
                      </td>
                      <td className="py-3 px-2 text-right font-semibold">₹{purchase.platformSellingPrice}</td>
                      <td className="py-3 px-2 text-xs text-gray-600">
                        {new Date(purchase.purchasedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        <Badge className={getStatusColor(purchase.status)}>{purchase.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4">
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages} ({totalCount} total)
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || loading}
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages || loading}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
