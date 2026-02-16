'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Users,
  Eye,
  ArrowRight,
  MapPin,
  Navigation,
} from 'lucide-react'
import { useRealtimeVendor } from '../../hooks/useRealtimeVendor'
import { useToast } from '../../hooks/use-toast'
import { getHeaders, API_BASE_URL } from '../../lib/api'

interface Overview {
  totalOffers: number
  activeOffers: number
  totalRedemptions: number
  totalDiscount: number
}

interface Order {
  id: string
  studentName?: string
  product?: string
  title?: string
  discount: number
  discountValue?: number
  total?: string
  status: string
  date?: string
  redemptions?: number
  category?: string
  createdAt?: string
}

interface Verification {
  id: string
  studentName: string
  email: string
  university?: string
  documentType: string
  submittedAt: string
  status: string
  documentUrl?: string
  rejectionReason?: string
}

export function VendorDashboardOverview() {
  const [dateRange, setDateRange] = useState('month')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [pendingVerifications, setPendingVerifications] = useState<Verification[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingVerifications, setLoadingVerifications] = useState(false)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [vendorLocation, setVendorLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const { toast } = useToast()

  // Real-time vendor hook
  const { isConnected, requestAnalyticsUpdate, requestOrdersUpdate, requestVerificationsUpdate, requestRevenueUpdate } = useRealtimeVendor(
    undefined,
    // onOrdersUpdated
    (ordersData) => {
      console.log('Orders updated via real-time:', ordersData.orders?.length)
      if (ordersData.orders && Array.isArray(ordersData.orders)) {
        const formattedOrders = ordersData.orders.slice(0, 4).map((order: any, index: number) => ({
          id: order.id || order._id || `order-${index}`,
          title: order.title,
          status: order.status || (order.isActive ? 'active' : 'inactive'),
          discount: order.discountValue || order.discount || 0,
          category: order.category,
          redemptions: order.redemptions || order.currentRedemptions || 0,
          createdAt: order.createdAt
        }))
        setRecentOrders(formattedOrders)
      }
    },
    undefined,
    undefined,
    undefined,
    // onOverviewUpdated
    (overviewData) => {
      console.log('Overview updated via real-time:', overviewData)
      setOverview(overviewData)
    },
    undefined,
    undefined,
    undefined,
    // onVerificationsUpdated
    (verificationsData) => {
      console.log('Verifications updated via real-time:', verificationsData.verifications?.length)
      if (verificationsData.verifications && Array.isArray(verificationsData.verifications)) {
        setPendingVerifications(verificationsData.verifications)
      }
    },
    undefined,
    // onRevenueUpdated
    (revenueData) => {
      console.log('Revenue updated via real-time:', revenueData)
      // Update overview with revenue data
      setOverview(prev => prev ? { ...prev, totalRevenue: revenueData.totalRevenue, accountBalance: revenueData.accountBalance } : null)
      // Reload recent transactions
      fetchRecentTransactions()
      // Trigger toast notification for revenue update
      if (revenueData.revenueAdded) {
        toast({
          title: '💰 Revenue Received!',
          description: `New revenue: ₹${revenueData.revenueAdded.toLocaleString('en-IN')} from ${revenueData.couponCount} coupon(s)`,
          variant: 'default',
        })
      }
    }
  )

  // Fetch overview on component mount
  useEffect(() => {
    fetchOverview()
    fetchRecentOrders()
    fetchPendingVerifications()
    fetchVendorLocation()
    fetchRecentTransactions()
  }, [])

  // Request real-time updates
  useEffect(() => {
    if (isConnected) {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          requestAnalyticsUpdate(user.id)
          requestOrdersUpdate(user.id)
          requestVerificationsUpdate(user.id)
          requestRevenueUpdate(user.id)
        } catch (error) {
          console.error('Failed to get vendor ID:', error)
        }
      }
    }
  }, [isConnected, requestAnalyticsUpdate, requestOrdersUpdate, requestVerificationsUpdate, requestRevenueUpdate])

  const fetchOverview = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vendor/dashboard/overview`, {
        headers: getHeaders(),
      })

      if (!response.ok) throw new Error('Failed to fetch overview')

      const data = await response.json()
      if (data.success && data.data) {
        setOverview(data.data)
      }
    } catch (error: any) {
      console.error('Error fetching overview:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load overview',
        variant: 'destructive',
      })
    }
  }

  const fetchRecentOrders = async () => {
    setLoadingOrders(true)
    try {
      const response = await fetch(`${API_BASE_URL}/vendor/orders?page=1&limit=4`, {
        headers: getHeaders(),
      })

      if (!response.ok) throw new Error('Failed to fetch orders')

      const data = await response.json()
      if (data.success && data.data && Array.isArray(data.data.orders)) {
        const formattedOrders = data.data.orders.map((order: any, index: number) => ({
          id: order.id || order._id || `order-${index}`,
          title: order.title,
          product: order.title,
          studentName: `Order ${order.id?.slice(-3)}`,
          discount: `${order.discount}%`,
          total: `₹${(order.originalPrice || 0) * (1 - order.discount / 100) || 'N/A'}`,
          status: order.status,
          date: new Date(order.createdAt).toLocaleDateString(),
        }))
        setRecentOrders(formattedOrders)
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error)
      // Silently fail, don't show toast for orders
    } finally {
      setLoadingOrders(false)
    }
  }

  const fetchPendingVerifications = async () => {
    setLoadingVerifications(true)
    try {
      const response = await fetch(`${API_BASE_URL}/vendor/pending-verifications?page=1&limit=5`, {
        headers: getHeaders(),
      })

      if (!response.ok) throw new Error('Failed to fetch verifications')

      const data = await response.json()
      if (data.success && data.data && Array.isArray(data.data.verifications)) {
        setPendingVerifications(data.data.verifications)
      }
    } catch (error: any) {
      console.error('Error fetching verifications:', error)
      // Silently fail, don't show toast for verifications
    } finally {
      setLoadingVerifications(false)
    }
  }

  const fetchVendorLocation = async () => {
    try {
      setLocationLoading(true)
      const response = await fetch(`${API_BASE_URL}/vendor/profile`, {
        headers: getHeaders(),
      })

      if (!response.ok) throw new Error('Failed to fetch location')

      const data = await response.json()
      if (data.success && data.data) {
        if (data.data.latitude && data.data.longitude) {
          setVendorLocation({
            latitude: data.data.latitude,
            longitude: data.data.longitude,
          })
        }
      }
    } catch (error: any) {
      console.error('Error fetching location:', error)
      // Silently fail for location
    } finally {
      setLocationLoading(false)
    }
  }

  const fetchRecentTransactions = async () => {
    setLoadingTransactions(true)
    try {
      const response = await fetch(`${API_BASE_URL}/vendor/coupon-purchases?page=1&limit=5&status=all`, {
        headers: getHeaders(),
      })

      if (!response.ok) throw new Error('Failed to fetch transactions')

      const data = await response.json()
      if (data.success && data.purchases && Array.isArray(data.purchases)) {
        const formattedTransactions = data.purchases.map((purchase: any) => ({
          id: purchase._id || purchase.couponCode,
          couponCode: purchase.couponCode,
          studentName: purchase.studentId?.name || 'Unknown',
          studentEmail: purchase.studentId?.email || '',
          amount: purchase.platformSellingPrice,
          discount: `${purchase.discountValue}${purchase.discountType === 'percentage' ? '%' : '₹'}`,
          offerTitle: purchase.offerId?.title || 'Unknown Offer',
          status: purchase.status,
          vendorApprovalStatus: purchase.vendorApprovalStatus,
          paidAt: purchase.purchasedAt,
          paymentStatus: purchase.paymentStatus,
        }))
        setRecentTransactions(formattedTransactions)
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error)
      // Silently fail
    } finally {
      setLoadingTransactions(false)
    }
  }

  const stats = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: `₹${(overview?.totalRevenue || 0).toLocaleString('en-IN')}`,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      id: 'balance',
      title: 'Account Balance',
      value: `₹${(overview?.accountBalance || 0).toLocaleString('en-IN')}`,
      change: 'Available',
      trend: 'up',
      icon: TrendingUp,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
    },
    {
      id: 'orders',
      title: 'Total Coupons Redeemed',
      value: String(overview?.totalCouponsRedeemed || 0),
      change: '+8.2%',
      trend: 'up',
      icon: ShoppingCart,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      id: 'active-offers',
      title: 'Active Offers',
      value: String(overview?.activeOffers || 0),
      change: '-2%',
      trend: 'down',
      icon: Eye,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
  ]

  // Use state variable for recent orders (already being fetched)
  // Remove hardcoded array

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header with Date Range */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome Back!</h1>
          <p className="text-gray-600 mt-2">Here's your vendor dashboard overview {isConnected && <span className="text-green-600">● Live</span>}</p>
        </div>
        <div className="flex gap-2">
          {['today', 'week', 'month', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg transition-all ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.id}
              className={`${stat.bgColor} border ${stat.borderColor} rounded-xl p-6 hover:shadow-md transition-all`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-3 flex items-center gap-1">
                    {stat.trend === 'up' ? (
                      <TrendingUp size={14} className="text-green-600" />
                    ) : (
                      <TrendingDown size={14} className="text-red-600" />
                    )}
                    <span className={stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                      {stat.change}
                    </span>
                    <span>from last month</span>
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon size={24} className={stat.iconColor} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Live Location Card */}
      <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 rounded-xl p-6 text-white hover:shadow-lg transition-all">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={20} />
              <h3 className="font-semibold text-lg">Live Location Status</h3>
            </div>

            {vendorLocation?.latitude && vendorLocation?.longitude ? (
              <>
                <p className="text-sm opacity-90 mb-4">Your business location is visible to students</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs opacity-75">LATITUDE</p>
                    <p className="text-base font-semibold">{vendorLocation.latitude.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-75">LONGITUDE</p>
                    <p className="text-base font-semibold">{vendorLocation.longitude.toFixed(4)}</p>
                  </div>
                </div>
                <button
                  onClick={() => window.open(`https://www.google.com/maps/?q=${vendorLocation.latitude},${vendorLocation.longitude}`, '_blank')}
                  className="px-3 py-1 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
                >
                  📍 View on Maps
                </button>
              </>
            ) : (
              <>
                <p className="text-sm opacity-90 mb-3">Location not set</p>
                <p className="text-xs opacity-75 mb-4">Update your live location in Profile Settings to be discoverable by students</p>
                <button
                  onClick={() => window.location.href = '/vendor/profilesettings'}
                  className="px-3 py-1 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
                >
                  Set Location
                </button>
              </>
            )}
          </div>
          <div>
            <Navigation size={48} className="opacity-30" />
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Orders</h2>
            <button className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 text-sm">
              View All <ArrowRight size={16} />
            </button>
          </div>

          <div className="overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No orders yet. Create an offer to get started!</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Order ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Student</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Product</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Discount</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Total</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-medium text-blue-600">{order.id}</td>
                      <td className="py-3 px-4 text-gray-700">{order.studentName}</td>
                      <td className="py-3 px-4 text-gray-700">{order.product}</td>
                      <td className="py-3 px-4 font-semibold text-green-600">{order.discount}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{order.total}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pending Verifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Pending Verifications</h2>
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
              {pendingVerifications.length}
            </span>
          </div>

          <div className="space-y-4">
            {pendingVerifications.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-gray-500 text-sm">No pending verifications</p>
              </div>
            ) : (
              pendingVerifications.map((verification) => (
                <div
                  key={verification.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{verification.studentName}</p>
                      <p className="text-xs text-gray-600 mt-1">{verification.university}</p>
                      <p className="text-xs text-gray-500 mt-1">{verification.documentType}</p>
                      <p className="text-xs text-gray-500 mt-2">{verification.submittedAt}</p>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 font-medium text-xs">
                      Review
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <button className="w-full mt-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition">
            View All Requests
          </button>
        </div>
      </div>

      {/* Recent Revenue Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Revenue Transactions</h2>
          <button className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 text-sm">
            View All <ArrowRight size={16} />
          </button>
        </div>

        <div className="overflow-x-auto">
          {loadingTransactions ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Loading transactions...</p>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No transactions yet. Students will appear here when they purchase coupons!</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Coupon Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Student</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Offer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Revenue</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Discount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Payment Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-mono text-sm text-blue-600">{transaction.couponCode.substring(0, 6)}...</td>
                    <td className="py-3 px-4 text-gray-700">
                      <div className="text-sm font-medium">{transaction.studentName}</div>
                      <div className="text-xs text-gray-500">{transaction.studentEmail}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-700 text-sm">{transaction.offerTitle.substring(0, 20)}</td>
                    <td className="py-3 px-4 font-bold text-green-600">₹{transaction.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-gray-700">{transaction.discount}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.paymentStatus === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : transaction.paymentStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.paymentStatus.charAt(0).toUpperCase() + transaction.paymentStatus.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600">
                      {new Date(transaction.paidAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 hover:shadow-lg transition-all">
          <h3 className="font-semibold text-sm opacity-90">Average Order Value</h3>
          <p className="text-3xl font-bold mt-3">
            {overview && overview.totalRedemptions > 0
              ? `₹${Math.round(overview.totalDiscount / overview.totalRedemptions).toLocaleString('en-IN')}`
              : '₹0'}
          </p>
          <p className="text-sm opacity-75 mt-2">Across all transactions</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 hover:shadow-lg transition-all">
          <h3 className="font-semibold text-sm opacity-90">Discounts Given</h3>
          <p className="text-3xl font-bold mt-3">
            ₹{overview?.totalDiscount ? overview.totalDiscount.toLocaleString('en-IN') : '0'}
          </p>
          <p className="text-sm opacity-75 mt-2">Total student discounts</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 hover:shadow-lg transition-all">
          <h3 className="font-semibold text-sm opacity-90">Redemptions</h3>
          <p className="text-3xl font-bold mt-3">{overview?.totalRedemptions || 0}</p>
          <p className="text-sm opacity-75 mt-2">Total offer redemptions</p>
        </div>
      </div>
    </main>
  )
}
