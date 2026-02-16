'use client'

import { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus, X, Save, Calendar } from 'lucide-react'
import { useRealtimeVendor } from '../../hooks/useRealtimeVendor'
import { useToast } from '../../hooks/use-toast'
import { getHeaders, API_BASE_URL } from '../../lib/api'

interface Discount {
  id: string | number
  name: string
  type: 'percentage' | 'fixed'
  value: string
  maxAmount?: string
  minPurchase?: string
  validFrom?: string
  validTo?: string
  status: 'active' | 'expired' | 'pending'
  usageCount?: number
  claimedByStudents?: number
}

export function VendorDiscounts() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const { toast } = useToast()
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    maxAmount: '',
    minPurchase: '',
    validFrom: '',
    validTo: '',
  })

  // Real-time vendor hook
  const { isConnected, requestDiscountsUpdate } = useRealtimeVendor(
    undefined,
    undefined,
    undefined,
    // onDiscountsUpdated
    (update) => {
      console.log('Discounts updated via real-time:', update.discounts)
      if (update.discounts && Array.isArray(update.discounts)) {
        const formattedDiscounts = update.discounts.map((d: any) => ({
          id: d.id || d._id,
          name: d.name || d.title,
          type: d.type || 'percentage',
          value: String(d.value || d.discountValue || 0),
          status: d.status || 'active',
          usageCount: d.usageCount || 0,
          claimedByStudents: d.redemptions?.length || d.redeemedBy?.length || 0,
        }))
        setDiscounts(formattedDiscounts)
      }
      setLoading(false)
    },
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    // onCouponClaimed
    (claimData) => {
      console.log('Real-time coupon claim update:', claimData)
      // Update the discount with the new claim count
      setDiscounts(prevDiscounts => 
        prevDiscounts.map(discount => 
          discount.id === claimData.offerId 
            ? {
                ...discount,
                claimedByStudents: claimData.claimedByStudents,
                usageCount: claimData.totalClaims,
              }
            : discount
        )
      )
      // Show toast notification
      toast({
        title: '🎉 New Claim!',
        description: claimData.message || `A student claimed "${claimData.offerTitle}"`,
        variant: 'default',
      })
    }
  )

  // Fetch discounts on component mount
  useEffect(() => {
    fetchDiscounts()
  }, [])

  // Request real-time update
  useEffect(() => {
    if (isConnected) {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          requestDiscountsUpdate(user.id)
        } catch (error) {
          console.error('Failed to get vendor ID:', error)
        }
      }
    }
  }, [isConnected, requestDiscountsUpdate])

  const fetchDiscounts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/vendor/discounts`, {
        headers: getHeaders(),
      })

      if (!response.ok) throw new Error('Failed to fetch discounts')

      const data = await response.json()
      if (data.success && data.data && Array.isArray(data.data.discounts)) {
        const formatted = data.data.discounts.map((d: any) => ({
          id: d.id || d._id,
          name: d.name || d.title || 'Unnamed Discount',
          type: d.type || 'percentage',
          value: String(d.value || d.discountValue || 0),
          maxAmount: d.maxAmount || '',
          minPurchase: d.minPurchase || '',
          validFrom: d.validFrom || '',
          validTo: d.validTo || '',
          status: d.status || 'active',
          usageCount: d.usageCount || 0,
          claimedByStudents: d.redemptions?.length || d.redeemedBy?.length || 0,
        }))
        setDiscounts(formatted)
      }
    } catch (error: any) {
      console.error('Error fetching discounts:', error)
      setDiscounts([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddDiscount = async () => {
    if (!formData.name || !formData.value) {
      toast({
        title: 'Error',
        description: 'Please fill in discount name and value',
        variant: 'destructive',
      })
      return
    }

    try {
      // Convert discount value to number
      const discountNum = Number(formData.value)
      if (isNaN(discountNum) || discountNum < 0) {
        throw new Error('Discount value must be a valid positive number')
      }

      const submitData = {
        title: formData.name,
        description: `${formData.type === 'percentage' ? discountNum + '%' : '₹' + discountNum} discount`,
        category: 'other',
        discount: discountNum,
        discountType: formData.type,
        startDate: formData.validFrom || undefined,
        endDate: formData.validTo || undefined,
      }

      const response = await fetch(`${API_BASE_URL}/offers/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(submitData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create discount')
      }
      
      await fetchDiscounts()
      setFormData({
        name: '',
        type: 'percentage',
        value: '',
        maxAmount: '',
        minPurchase: '',
        validFrom: '',
        validTo: '',
      })
      setShowAddModal(false)
      toast({
        title: 'Success',
        description: 'Discount created successfully and is pending admin approval',
        variant: 'default',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create discount',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteDiscount = async (id: string | number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/offers/delete/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })

      if (!response.ok) throw new Error('Failed to delete discount')
      
      await fetchDiscounts()
      toast({
        title: 'Success',
        description: 'Discount deleted successfully',
        variant: 'default',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete discount',
        variant: 'destructive',
      })
    }
  }

  const handleEditDiscount = (id: string | number) => {
    const discount = discounts.find(d => d.id === id)
    if (discount) {
      const { status, usageCount, ...editData } = discount
      setFormData(editData)
      setEditingId(id)
      setShowAddModal(true)
    }
  }

  const handleUpdateDiscount = async () => {
    if (editingId !== null) {
      try {
        const response = await fetch(`${API_BASE_URL}/offers/update/${editingId}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(formData),
        })

        if (!response.ok) throw new Error('Failed to update discount')
        
        await fetchDiscounts()
        setEditingId(null)
        setShowAddModal(false)
        setFormData({
          name: '',
          type: 'percentage',
          value: '',
          maxAmount: '',
          minPurchase: '',
          validFrom: '',
          validTo: '',
        })
        toast({
          title: 'Success',
          description: 'Discount updated successfully',
          variant: 'default',
        })
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update discount',
          variant: 'destructive',
        })
      }
    }
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Student Discounts</h1>
          <p className="text-gray-600 mt-2">Create and manage discounts for students</p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true)
            setEditingId(null)
            setFormData({
              name: '',
              type: 'percentage',
              value: '',
              maxAmount: '',
              minPurchase: '',
              validFrom: '',
              validTo: '',
            })
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus size={20} />
          Create Discount
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['all', 'active', 'expired', 'scheduled'].map((filter) => (
          <button
            key={filter}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition font-medium text-sm"
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Discounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {discounts.map((discount) => (
          <div
            key={discount.id}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all"
          >
            {/* Status Badge */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{discount.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {discount.type === 'percentage' ? 'Percentage Discount' : 'Fixed Amount'}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  discount.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : discount.status === 'expired'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {discount.status.charAt(0).toUpperCase() + discount.status.slice(1)}
              </span>
            </div>

            {/* Discount Details */}
            <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">Discount Value</span>
                <span className="font-bold text-2xl text-blue-600">{discount.value}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Max Amount</span>
                <span className="font-semibold text-gray-900">{discount.maxAmount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Min Purchase</span>
                <span className="font-semibold text-gray-900">{discount.minPurchase}</span>
              </div>
            </div>

            {/* Validity */}
            <div className="space-y-2 mb-6 pb-6 border-b border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                <span>Valid From: {discount.validFrom}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                <span>Valid To: {discount.validTo}</span>
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs text-gray-600">Usage</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{discount.usageCount} uses</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Students Claimed</p>
                  <p className="text-lg font-bold text-blue-600 mt-1">{discount.claimedByStudents || 0} students</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleEditDiscount(discount.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium text-sm"
              >
                <Edit2 size={16} />
                Edit
              </button>
              <button
                onClick={() => handleDeleteDiscount(discount.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition font-medium text-sm"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Discount Modal */}
      {(showAddModal || editingId !== null) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId !== null ? 'Edit Discount' : 'Create Discount'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingId(null)
                  setFormData({
                    name: '',
                    type: 'percentage',
                    value: '',
                    maxAmount: '',
                    minPurchase: '',
                    validFrom: '',
                    validTo: '',
                  })
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., Back to School"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Value * {formData.type === 'percentage' ? '(%)' : '(₹)'}
                </label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder={formData.type === 'percentage' ? 'e.g., 15' : 'e.g., 500'}
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Amount
                </label>
                <input
                  type="text"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="₹5000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Purchase
                </label>
                <input
                  type="text"
                  value={formData.minPurchase}
                  onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="₹0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid To
                  </label>
                  <input
                    type="date"
                    value={formData.validTo}
                    onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingId(null)
                  setFormData({
                    name: '',
                    type: 'percentage',
                    value: '',
                    maxAmount: '',
                    minPurchase: '',
                    validFrom: '',
                    validTo: '',
                  })
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={editingId !== null ? handleUpdateDiscount : handleAddDiscount}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition text-sm"
              >
                <Save size={16} />
                {editingId !== null ? 'Update' : 'Create'} Discount
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
