'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Download, TrendingUp, DollarSign, Wallet } from 'lucide-react'
import { useRealtimeVendor } from '../../hooks/useRealtimeVendor'
import { useToast } from '../../hooks/use-toast'
import { getHeaders, API_BASE_URL } from '../../lib/api'

interface AnalyticsData {
  totalOffers: number
  activeOffers: number
  totalRedemptions: number
  totalDiscount: number
  offers: any[]
}

interface RevenueData {
  totalRevenue: number
  accountBalance: number
  periodRevenue: number
  periodCoupons: number
  period: string
  statistics: {
    couponsAccepted: number
    couponsRedeemed: number
    couponsPending: number
  }
  paymentMethods: Array<{
    method: string
    count: number
    revenue: number
  }>
}

export function VendorAnalytics() {
  const [dateRange, setDateRange] = useState('month')
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Real-time vendor hook
  const { isConnected, requestAnalyticsUpdate, requestRevenueUpdate } = useRealtimeVendor(
    undefined,
    undefined,
    // onAnalyticsUpdated
    (update) => {
      console.log('Analytics updated via real-time:', update.analytics)
      setAnalytics(update.analytics)
      setLoading(false)
    },
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    // onRevenueUpdated
    (update) => {
      console.log('Revenue updated via real-time:', update)
      setRevenueData(prev => prev ? {
        ...prev,
        totalRevenue: update.totalRevenue,
        accountBalance: update.accountBalance,
        periodRevenue: (prev.periodRevenue || 0) + (update.revenueAdded || 0),
        periodCoupons: (prev.periodCoupons || 0) + (update.couponCount || 0),
      } : null)
    }
  )

  // Fetch analytics on component mount
  useEffect(() => {
    fetchAnalytics()
    fetchRevenue()
  }, [])

  // Request real-time update
  useEffect(() => {
    if (isConnected) {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          requestAnalyticsUpdate(user.id)
          requestRevenueUpdate(user.id)
        } catch (error) {
          console.error('Failed to get vendor ID:', error)
        }
      }
    }
  }, [isConnected, requestAnalyticsUpdate, requestRevenueUpdate])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const period = dateRange === 'month' ? '30' : dateRange === 'week' ? '7' : dateRange === 'year' ? '365' : '1'
      const response = await fetch(`${API_BASE_URL}/vendor/analytics?period=${period}`, {
        headers: getHeaders(),
      })

      if (!response.ok) throw new Error('Failed to fetch analytics')

      const data = await response.json()
      if (data.success && data.data) {
        setAnalytics(data.data)
      }
    } catch (error: any) {
      console.error('Error fetching analytics:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load analytics',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRevenue = async () => {
    try {
      const period = dateRange === 'month' ? '30' : dateRange === 'week' ? '7' : dateRange === 'year' ? '365' : '1'
      const response = await fetch(`${API_BASE_URL}/vendor/revenue?period=${period}`, {
        headers: getHeaders(),
      })

      if (!response.ok) throw new Error('Failed to fetch revenue')

      const data = await response.json()
      if (data.success && data.data) {
        setRevenueData(data.data)
      }
    } catch (error: any) {
      console.error('Error fetching revenue:', error)
      // Silently fail, don't show toast
    }
  }

  const dailySalesData = analytics?.offers?.slice(0, 7).map((offer, index) => ({
    date: `Day ${index + 1}`,
    orders: offer.redemptions || 0,
    revenue: (offer.redemptions || 0) * 1000,
    discounts: (offer.discount || 0) * 100,
  })) || []

  const discountBreakdownData = analytics?.offers?.slice(0, 3).map((offer, index) => ({
    name: `${offer.title?.substring(0, 15) || `Category ${index + 1}`} (${offer.discount || 0}%)`,
    value: offer.discount || 0,
  })) || []

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

  const topDiscounts = analytics?.offers?.slice(0, 4).map(offer => ({
    name: offer.title,
    uses: offer.redemptions || 0,
    revenue: `₹${(offer.redemptions || 0) * 1000}`,
    discount: `${offer.discount}%`,
  })) || []

  const studentStats = [
    { category: 'Total Offers', count: analytics?.totalOffers || 0, growth: '+15.3%' },
    { category: 'Active Offers', count: analytics?.activeOffers || 0, growth: '+12.1%' },
    { category: 'Redemptions', count: analytics?.totalRedemptions || 0, growth: '+8.5%' },
    { category: 'Total Discount', count: `₹${(analytics?.totalDiscount || 0) / 100000}L`, growth: '+22.4%' },
  ]

  const revenueStats = [
    { category: 'Total Revenue', count: `₹${(revenueData?.totalRevenue || 0).toLocaleString('en-IN')}`, growth: revenueData?.period || '' },
    { category: 'Account Balance', count: `₹${(revenueData?.accountBalance || 0).toLocaleString('en-IN')}`, growth: 'Available' },
    { category: 'Period Revenue', count: `₹${(revenueData?.periodRevenue || 0).toLocaleString('en-IN')}`, growth: revenueData?.period || '' },
    { category: 'Period Coupons', count: revenueData?.periodCoupons || 0, growth: 'Sales' },
  ]

  if (loading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-pulse text-center">
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-2">Sales, discounts, and offer insights {isConnected && <span className="text-green-600">● Live</span>}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['today', 'week', 'month', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => {
                setDateRange(range)
                fetchAnalytics()
                fetchRevenue()
              }}
              className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
          <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:border-gray-300 transition font-medium text-sm">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
          <p className="text-gray-600 text-sm font-medium">Total Orders</p>
          <p className="text-3xl font-bold text-blue-900 mt-2">{analytics?.totalRedemptions || 0}</p>
          <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
            <TrendingUp size={12} className="text-green-600" />
            <span className="text-green-600">+12.5%</span> from last period
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
          <p className="text-gray-600 text-sm font-medium">Total Offers</p>
          <p className="text-3xl font-bold text-green-900 mt-2">{analytics?.totalOffers || 0}</p>
          <p className="text-xs text-gray-600 mt-2">
            {analytics?.activeOffers || 0} active
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6">
          <p className="text-gray-600 text-sm font-medium">Total Discounts</p>
          <p className="text-3xl font-bold text-orange-900 mt-2">₹{((analytics?.totalDiscount || 0) / 100000).toFixed(1)}L</p>
          <p className="text-xs text-gray-600 mt-2">Total given</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
          <p className="text-gray-600 text-sm font-medium">Avg Order Value</p>
          <p className="text-3xl font-bold text-purple-900 mt-2">₹{analytics?.totalRedemptions ? (analytics.totalDiscount / analytics.totalRedemptions).toFixed(0) : 0}</p>
          <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
            <TrendingUp size={12} className="text-green-600" />
            <span className="text-green-600">+5.1%</span> increase
          </p>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-emerald-600" />
            <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
          </div>
          <p className="text-3xl font-bold text-emerald-900 mt-2">₹{(revenueData?.totalRevenue || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-600 mt-2">Lifetime earnings</p>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-teal-600" />
            <p className="text-gray-600 text-sm font-medium">Account Balance</p>
          </div>
          <p className="text-3xl font-bold text-teal-900 mt-2">₹{(revenueData?.accountBalance || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-600 mt-2">Available to withdraw</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-xl p-6">
          <p className="text-gray-600 text-sm font-medium">Period Revenue</p>
          <p className="text-3xl font-bold text-cyan-900 mt-2">₹{(revenueData?.periodRevenue || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-600 mt-2">{revenueData?.period || 'This period'}</p>
        </div>

        <div className="bg-gradient-to-br from-lime-50 to-lime-100 border border-lime-200 rounded-xl p-6">
          <p className="text-gray-600 text-sm font-medium">Period Sales</p>
          <p className="text-3xl font-bold text-lime-900 mt-2">{revenueData?.periodCoupons || 0}</p>
          <p className="text-xs text-gray-600 mt-2">Coupons sold {revenueData?.period || ''}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Daily Sales & Revenue</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailySalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="discounts" stroke="#10B981" strokeWidth={2} name="Discounts Given" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Discount Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Discount by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={discountBreakdownData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name }) => name}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {discountBreakdownData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Discounts Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Top Performing Discounts</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Discount Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 hidden sm:table-cell">Times Used</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 hidden md:table-cell">Total Revenue</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Discount Value</th>
              </tr>
            </thead>
            <tbody>
              {topDiscounts.length > 0 ? (
                topDiscounts.map((discount, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-semibold text-gray-900">{discount.name}</td>
                    <td className="py-3 px-4 hidden sm:table-cell text-gray-700">{discount.uses}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-700">{discount.revenue}</td>
                    <td className="py-3 px-4 font-bold text-green-600">{discount.discount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-center text-gray-500">No discounts found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {studentStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
            <p className="text-gray-600 text-sm font-medium">{stat.category}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.count}</p>
            <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
              <TrendingUp size={12} className="text-green-600" />
              <span className="text-green-600">{stat.growth}</span> growth
            </p>
          </div>
        ))}
      </div>

      {/* Monthly Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Orders Per Period</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailySalesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="orders" fill="#3B82F6" name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </main>
  )
}
