'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader, TrendingUp, DollarSign, CheckCircle, Clock, RefreshCw, Bell } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getVendorRevenueData } from '@/lib/couponAPI'
import { io } from 'socket.io-client'

interface RevenueData {
  vendorName: string
  businessName: string
  accountBalance: number
  totalRevenue: number
  totalCouponsAccepted: number
  totalCouponsRedeemed: number
  totalCouponsPending: number
  totalCouponsRejected: number
}

interface CouponBreakdown {
  pending: { count: number; totalRevenue: number }
  accepted: { count: number; totalRevenue: number }
  rejected: { count: number; totalRevenue: number }
}

interface RecentTransaction {
  amount: number
  type: string
  status: string
  timestamp: string
}

export function VendorRevenueAnalytics() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [couponBreakdown, setCouponBreakdown] = useState<CouponBreakdown | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [realtimeNotification, setRealtimeNotification] = useState<any>(null)
  const { toast } = useToast()

  const socketRef = useRef<any>(null)

  useEffect(() => {
    fetchRevenueData()
    setupRealtimeConnection()

    return () => {
      // Cleanup socket connection created earlier
      try {
        const socket = socketRef.current
        const userStr = localStorage.getItem('user')
        const vendorId = userStr ? JSON.parse(userStr).id : null
        if (socket) {
          if (vendorId) socket.emit('vendor:leave', vendorId)
          socket.disconnect()
        }
      } catch (err) {
        console.warn('Error during socket cleanup', err)
      }
    }
  }, [])

  const setupRealtimeConnection = () => {
    try {

      const userStr = localStorage.getItem('user')
      const token = localStorage.getItem('auth_token')
      const vendorId = userStr ? JSON.parse(userStr).id : null

      if (!vendorId || !token) {
        console.warn('No vendor ID or token found for real-time connection')
        return
      }

      const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      })

      socket.on('connect', () => {
        console.log('🔌 Connected to real-time server')
        setIsConnected(true)
        socket.emit('vendor:join', vendorId)
      })

      socket.on('disconnect', () => {
        console.log('📴 Disconnected from real-time server')
        setIsConnected(false)
      })

      socket.on('vendor:coupon-purchased', async (data: any) => {
        console.log('💰 Real-time purchase notification:', data)
        
        // Show notification
        setRealtimeNotification(data)
        toast({
          title: '🎉 New Purchase!',
          description: `${data.quantity} coupon(s) purchased for ₹${data.totalPrice} from "${data.offerTitle}"`,
          variant: 'default',
        })
        
        // Auto-refresh revenue data
        setTimeout(() => {
          fetchRevenueData()
        }, 500)
      })

      // Listen for explicit revenue updates (sent by backend)
      socket.on('vendor:revenue:updated', (data: any) => {
        console.log('📈 Real-time revenue update:', data)
        if (data.totalRevenue || data.accountBalance) {
          setRevenueData(prev => prev ? { ...prev, totalRevenue: data.totalRevenue, accountBalance: data.accountBalance } : prev)
        }
        if (data.revenueAdded) {
          toast({
            title: '💰 Revenue Credited',
            description: `₹${data.revenueAdded.toLocaleString('en-IN')} added to your account`,
            variant: 'default',
          })
        }
        // Refresh recent transactions
        fetchRecentTransactions()
      })

      // Save socket ref for cleanup
      socketRef.current = socket

      socket.on('error', (error: any) => {
        console.error('Socket error:', error)
      })
    } catch (error) {
      console.error('Failed to setup real-time connection:', error)
    }
  }

  const fetchRevenueData = async () => {
    try {
      setLoading(true)
      const data = await getVendorRevenueData()
      
      if (data.success) {
        setRevenueData(data.dashboard)
        setCouponBreakdown(data.couponBreakdown)
        setRecentTransactions(data.recentTransactions || [])
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to load revenue data',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to load revenue data'
      console.error('Error fetching revenue data:', {
        error,
        message: errorMessage,
        status: error?.status,
      })
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchRevenueData()
    setRefreshing(false)
    toast({
      title: 'Refreshed',
      description: 'Revenue data has been updated',
    })
  }

  const clearNotification = () => {
    setRealtimeNotification(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading revenue data...</span>
      </div>
    )
  }

  if (!revenueData) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
        <CardContent className="pt-6 text-center">
          <p className="text-red-700 dark:text-red-300">Failed to load revenue data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Real-time Notification */}
      {realtimeNotification && (
        <div className="relative overflow-hidden rounded-lg border-2 border-green-400 bg-green-50 dark:bg-green-900/20 p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Bell className="w-6 h-6 text-green-600 animate-bounce" />
            </div>
            <div className="flex-grow">
              <h3 className="font-semibold text-green-800 dark:text-green-200">🎉 New Purchase Received!</h3>
              <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                {realtimeNotification.quantity} coupon(s) purchased for ₹{realtimeNotification.totalPrice?.toLocaleString('en-IN')} 
                from "{realtimeNotification.offerTitle}"
              </p>
              <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                {new Date(realtimeNotification.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={clearNotification}
              className="ml-auto flex-shrink-0 text-green-600 hover:text-green-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      <div className="flex items-center justify-end gap-2">
        <span className={`text-xs font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
          {isConnected ? '🟢 Live' : '🔴 Offline'}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Revenue Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your earnings from accepted coupon sales
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Account Balance */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Balance</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  ₹{revenueData.accountBalance.toLocaleString('en-IN')}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  ₹{revenueData.totalRevenue.toLocaleString('en-IN')}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Accepted Coupons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Accepted</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {revenueData.totalCouponsAccepted}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Coupons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                  {revenueData.totalCouponsPending}
                </p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coupon Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Coupon Status Breakdown</CardTitle>
            <CardDescription>Distribution by approval status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span className="text-sm font-medium">Accepted</span>
                </div>
                <span className="font-bold text-green-600">{couponBreakdown?.accepted?.count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <span className="font-bold text-yellow-600">{couponBreakdown?.pending?.count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-600"></div>
                  <span className="text-sm font-medium">Rejected</span>
                </div>
                <span className="font-bold text-red-600">{couponBreakdown?.rejected?.count ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Status</CardTitle>
            <CardDescription>Amount earned from each status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
                <span className="text-sm font-medium">Accepted</span>
                <span className="font-bold text-green-600">₹{(couponBreakdown?.accepted?.totalRevenue ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <span className="text-sm font-medium">Pending</span>
                <span className="font-bold text-yellow-600">₹{(couponBreakdown?.pending?.totalRevenue ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded">
                <span className="text-sm font-medium">Rejected</span>
                <span className="font-bold text-red-600">₹{(couponBreakdown?.rejected?.totalRevenue ?? 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Info */}
        <Card>
          <CardHeader>
            <CardTitle>Vendor Information</CardTitle>
            <CardDescription>Your business details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Vendor Name</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{revenueData.vendorName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Business Name</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{revenueData.businessName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Total Redeemed</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{revenueData.totalCouponsRedeemed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest revenue updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((transaction, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <Badge variant={transaction.type === 'accepted' ? 'default' : 'secondary'}>
                          {transaction.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-semibold">₹{transaction.amount.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4">
                        <Badge variant={transaction.status === 'credited' ? 'default' : 'secondary'}>
                          {transaction.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {new Date(transaction.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State for Recent Transactions */}
      {recentTransactions.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No transactions yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Accept coupon purchases to start earning revenue
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default VendorRevenueAnalytics

