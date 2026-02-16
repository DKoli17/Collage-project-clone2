'use client'

import { useState, useEffect } from 'react'
import { Download, Eye } from 'lucide-react'
import { useRealtimeVendor } from '../../hooks/useRealtimeVendor'
import { useToast } from '../../hooks/use-toast'
import { getHeaders, API_BASE_URL } from '../../lib/api'

interface Order {
  id: string
  studentName?: string
  email?: string
  university?: string
  product: string
  originalPrice?: string
  discountApplied?: string
  finalPrice?: string
  orderDate?: string
  status: string
  quantity?: number
  title?: string
  category?: string
  discount?: number
  redemptions?: number
  maxRedemptions?: number
  createdAt?: string
}

export function VendorOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const { toast } = useToast()

  // Real-time vendor hook
  const { isConnected, requestOrdersUpdate } = useRealtimeVendor(
    undefined,
    // onOrdersUpdated
    (update) => {
      console.log('Orders updated via real-time:', update.orders)
      if (update.orders && update.orders.length > 0) {
        const formattedOrders = update.orders.map((o: any) => ({
          id: o.id || o._id,
          title: o.title,
          category: o.category,
          product: o.title,
          originalPrice: o.originalPrice || '₹0',
          discount: o.discount || 0,
          finalPrice: o.finalPrice || '₹0',
          status: o.status || 'active',
          quantity: 1,
          redemptions: o.redemptions || 0,
          maxRedemptions: o.maxRedemptions || 0,
          createdAt: o.createdAt || new Date().toISOString(),
        }))
        setOrders(formattedOrders)
      }
      setLoading(false)
    }
  )

  // Fetch orders on component mount
  useEffect(() => {
    fetchOrders()
  }, [])

  // Request real-time update
  useEffect(() => {
    if (isConnected) {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          requestOrdersUpdate(user.id)
        } catch (error) {
          console.error('Failed to get vendor ID:', error)
        }
      }
    }
  }, [isConnected, requestOrdersUpdate])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/vendor/orders`, {
        headers: getHeaders(),
      })

      if (!response.ok) throw new Error('Failed to fetch orders')

      const data = await response.json()
      if (data.success && data.data.orders) {
        // Ensure each order has a unique ID
        const ordersWithIds = data.data.orders.map((order: any, index: number) => ({
          ...order,
          id: order.id || order._id || `order-${Date.now()}-${index}`,
        }))
        setOrders(ordersWithIds)
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load orders',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter(o =>
    filterStatus === 'all' ? true : o.status === filterStatus
  )

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      delivered: 'bg-green-100 text-green-800',
      shipped: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-center">
            <p className="text-gray-500">Loading orders...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders & Redemptions</h1>
          <p className="text-gray-600 mt-2">Track student discount redemptions {isConnected && <span className="text-green-600">● Live</span>}</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition">
          <Download size={20} />
          Export Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{orders.length}</p>
          <p className="text-xs text-gray-500 mt-2">All time</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Active Orders</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{orders.filter(o => o.status === 'active').length}</p>
          <p className="text-xs text-gray-500 mt-2">Currently active</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Total Redemptions</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {orders.reduce((sum, o) => sum + (o.redemptions || 0), 0)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Total uses</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-600 text-sm font-medium">Avg Discount</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {orders.length > 0 ? (orders.reduce((sum, o) => sum + (o.discount || 0), 0) / orders.length).toFixed(1) : 0}%
          </p>
          <p className="text-xs text-gray-500 mt-2">Per offer</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-4 sm:px-6 font-semibold text-gray-900">Product/Offer</th>
                <th className="text-left py-4 px-4 sm:px-6 font-semibold text-gray-900 hidden sm:table-cell">Category</th>
                <th className="text-left py-4 px-4 sm:px-6 font-semibold text-gray-900 hidden md:table-cell">Discount</th>
                <th className="text-left py-4 px-4 sm:px-6 font-semibold text-gray-900 hidden lg:table-cell">Redemptions</th>
                <th className="text-left py-4 px-4 sm:px-6 font-semibold text-gray-900">Status</th>
                <th className="text-left py-4 px-4 sm:px-6 font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => (
                  <tr key={order.id || index} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="py-4 px-4 sm:px-6">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{order.product}</p>
                        <p className="text-xs text-gray-500">{order.category || 'General'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-gray-700 hidden sm:table-cell text-sm">
                      {order.category || 'General'}
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-semibold text-gray-900 hidden md:table-cell text-sm">
                      {order.discount}%
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-gray-700 hidden lg:table-cell text-sm">
                      {order.redemptions || 0} / {order.maxRedemptions || '∞'}
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      <button
                        onClick={() => setSelectedOrder(order.id)}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {orders.find(o => o.id === selectedOrder) && (
                <>
                  <div>
                    <p className="text-gray-500">Product</p>
                    <p className="font-semibold text-gray-900">{orders.find(o => o.id === selectedOrder)?.product}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-semibold text-gray-900">{orders.find(o => o.id === selectedOrder)?.status}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Redemptions</p>
                      <p className="font-semibold text-gray-900">{orders.find(o => o.id === selectedOrder)?.redemptions}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                    >
                      Close
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
