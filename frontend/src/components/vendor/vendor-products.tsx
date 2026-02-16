'use client'

import { useState, useEffect } from 'react'
import { Edit2, Trash2, Plus, X, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRealtimeVendor } from '../../hooks/useRealtimeVendor'
import { useToast } from '../../hooks/use-toast'
import { getHeaders, API_BASE_URL } from '../../lib/api'

interface Product {
  id: string
  _id?: string
  name?: string
  title?: string
  category: string
  price?: string
  discountValue?: number
  stock?: number
  image?: string
  status?: string
  description?: string
  originalPrice?: number
  discount?: number
}

export function VendorProducts() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    discount: '',
    discountType: 'percentage',
    maxRedemptions: '',
    startDate: '',
    endDate: '',
    termsAndConditions: '',
    image: null as File | null,
  })

  // Real-time vendor hook
  const { isConnected, requestProductsUpdate } = useRealtimeVendor(
    // onProductsUpdated
    (update) => {
      console.log('Products updated via real-time:', update.products)
      if (update.products && update.products.length > 0) {
        const formattedProducts = update.products.map((p: any) => ({
          id: p.id || p._id,
          title: p.title || p.name,
          description: p.description,
          category: p.category,
          discount: p.discount || p.discountValue,
          discountType: p.discountType,
          status: p.status,
          image: p.image,
          maxRedemptions: p.maxRedemptions,
        }))
        setProducts(formattedProducts)
      }
      setLoading(false)
    }
  )

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts()
  }, [])

  // Request real-time update
  useEffect(() => {
    if (isConnected) {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          requestProductsUpdate(user.id)
        } catch (error) {
          console.error('Failed to get vendor ID:', error)
        }
      }
    }
  }, [isConnected, requestProductsUpdate])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/vendor/products`, {
        headers: getHeaders(),
      })

      if (!response.ok) throw new Error('Failed to fetch products')

      const data = await response.json()
      if (data.success && data.data && data.data.products) {
        const formattedProducts = data.data.products.map((p: any) => ({
          id: p.id || p._id,
          title: p.title || p.name,
          description: p.description,
          category: p.category,
          discount: p.discount || p.discountValue,
          discountType: p.discountType || 'percentage',
          status: p.status,
          image: p.image,
          maxRedemptions: p.maxRedemptions,
        }))
        setProducts(formattedProducts)
      }
    } catch (error: any) {
      console.error('Error fetching products:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load products',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async () => {
    if (!formData.title || !formData.description || !formData.category || !formData.discount) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields (Title, Description, Category, Discount)',
        variant: 'destructive',
      })
      return
    }

    // Validate discount is a positive number
    const discountNum = Number(formData.discount)
    if (isNaN(discountNum) || discountNum < 0) {
      toast({
        title: 'Error',
        description: 'Discount must be a valid positive number',
        variant: 'destructive',
      })
      return
    }

    setFormSubmitting(true)
    try {
      const submitData = new FormData()
      submitData.append('title', formData.title)
      submitData.append('description', formData.description)
      submitData.append('category', formData.category)
      submitData.append('discount', String(discountNum))
      submitData.append('discountType', formData.discountType)
      if (formData.maxRedemptions) submitData.append('maxRedemptions', formData.maxRedemptions)
      if (formData.startDate) submitData.append('startDate', formData.startDate)
      if (formData.endDate) submitData.append('endDate', formData.endDate)
      if (formData.termsAndConditions) submitData.append('termsAndConditions', formData.termsAndConditions)
      if (formData.image) submitData.append('image', formData.image)

      const response = await fetch(`${API_BASE_URL}/offers/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: submitData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create product')
      }

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Product/Offer created successfully and is pending admin approval',
          variant: 'default',
        })
        
        // Refresh products
        await fetchProducts()
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: '',
          discount: '',
          discountType: 'percentage',
          maxRedemptions: '',
          startDate: '',
          endDate: '',
          termsAndConditions: '',
          image: null,
        })
        setShowAddModal(false)
      }
    } catch (error: any) {
      console.error('Error creating product:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create product',
        variant: 'destructive',
      })
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/offers/delete/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })

      if (!response.ok) throw new Error('Failed to delete product')

      toast({
        title: 'Success',
        description: 'Product deleted successfully',
        variant: 'default',
      })

      // Refresh products
      await fetchProducts()
    } catch (error: any) {
      console.error('Error deleting product:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete product',
        variant: 'destructive',
      })
    }
  }

  const handleEditProduct = (id: string) => {
    const product = products.find(p => p.id === id)
    if (product) {
      setFormData({
        title: product.title || '',
        description: product.description || '',
        category: product.category || '',
        discount: String(product.discount || 0),
        discountType: 'percentage',
        maxRedemptions: String(product.maxRedemptions || 0),
        startDate: '',
        endDate: '',
        termsAndConditions: '',
        image: null,
      })
      setEditingId(id)
      setShowAddModal(true)
    }
  }

  const handleUpdateProduct = async () => {
    if (!editingId) return
    
    if (!formData.title || !formData.description || !formData.category || !formData.discount) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    setFormSubmitting(true)
    try {
      const submitData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        discount: Number(formData.discount),
        discountType: formData.discountType,
        maxRedemptions: formData.maxRedemptions ? Number(formData.maxRedemptions) : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        termsAndConditions: formData.termsAndConditions || undefined,
      }

      const response = await fetch(`${API_BASE_URL}/offers/update/${editingId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(submitData),
      })

      if (!response.ok) throw new Error('Failed to update product')

      const data = await response.json()
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Product updated successfully',
          variant: 'default',
        })
        
        // Refresh products
        await fetchProducts()
        
        // Reset form and state
        setEditingId(null)
        setFormData({
          title: '',
          description: '',
          category: '',
          discount: '',
          discountType: 'percentage',
          maxRedemptions: '',
          startDate: '',
          endDate: '',
          termsAndConditions: '',
          image: null,
        })
        setShowAddModal(false)
      }
    } catch (error: any) {
      console.error('Error updating product:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update product',
        variant: 'destructive',
      })
    } finally {
      setFormSubmitting(false)
    }
  }

  const filteredProducts = products.filter(product => {
    const title = product.title || ''
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <main className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-center">
            <p className="text-gray-500">Loading products...</p>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Products & Services</h1>
          <p className="text-gray-600 mt-2">Manage your product catalog {isConnected && <span className="text-green-600">● Live</span>}</p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true)
            setEditingId(null)
            setFormData({
              title: '',
              description: '',
              category: '',
              discount: '',
              discountType: 'percentage',
              maxRedemptions: '',
              startDate: '',
              endDate: '',
              termsAndConditions: '',
              image: null,
            })
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          <option value="food">Food</option>
          <option value="retail">Retail</option>
          <option value="entertainment">Entertainment</option>
          <option value="technology">Technology</option>
          <option value="travel">Travel</option>
          <option value="education">Education</option>
          <option value="health">Health</option>
          <option value="sports">Sports</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-4 sm:px-6 font-semibold text-gray-900">Product</th>
                <th className="text-left py-4 px-4 sm:px-6 font-semibold text-gray-900 hidden sm:table-cell">Category</th>
                <th className="text-left py-4 px-4 sm:px-6 font-semibold text-gray-900 hidden md:table-cell">Price</th>
                <th className="text-left py-4 px-4 sm:px-6 font-semibold text-gray-900 hidden md:table-cell">Status</th>
                <th className="text-left py-4 px-4 sm:px-6 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr 
                    key={product.id} 
                    className="border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => navigate('/vendor/product', { state: { product } })}
                  >
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{product.image ? '🖼️' : '🏷️'}</span>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm sm:text-base">{product.title}</p>
                          <p className="text-xs sm:text-sm text-gray-500 sm:hidden">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-gray-700 hidden sm:table-cell text-sm">
                      {product.category}
                    </td>
                    <td className="py-4 px-4 sm:px-6 font-semibold text-gray-900 hidden md:table-cell text-sm">
                      {product.discount}% off
                    </td>
                    <td className="py-4 px-4 sm:px-6 hidden md:table-cell">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        product.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : product.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status || 'inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditProduct(product.id)
                          }}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProduct(product.id)
                          }}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-gray-500">
                    No products found. Add one to get started!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {(showAddModal || editingId !== null) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId !== null ? 'Edit Offer' : 'Create New Discount/Offer'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingId(null)
                  setFormData({
                    title: '',
                    description: '',
                    category: '',
                    discount: '',
                    discountType: 'percentage',
                    maxRedemptions: '',
                    startDate: '',
                    endDate: '',
                    termsAndConditions: '',
                    image: null,
                  })
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g., Back to School Sale"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Describe your offer..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Select category</option>
                    <option value="food">Food</option>
                    <option value="retail">Retail</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="technology">Technology</option>
                    <option value="travel">Travel</option>
                    <option value="education">Education</option>
                    <option value="health">Health</option>
                    <option value="sports">Sports</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Value * {formData.discountType === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder={formData.discountType === 'percentage' ? 'e.g., 15' : 'e.g., 500'}
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Redemptions
                  </label>
                  <input
                    type="number"
                    value={formData.maxRedemptions}
                    onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="0 for unlimited"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.termsAndConditions}
                  onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Any terms or conditions for this offer..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingId(null)
                  setFormData({
                    title: '',
                    description: '',
                    category: '',
                    discount: '',
                    discountType: 'percentage',
                    maxRedemptions: '',
                    startDate: '',
                    endDate: '',
                    termsAndConditions: '',
                    image: null,
                  })
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={editingId !== null ? handleUpdateProduct : handleAddProduct}
                disabled={formSubmitting}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
              >
                <Save size={16} />
                {formSubmitting ? 'Processing...' : editingId !== null ? 'Update' : 'Create'} Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
