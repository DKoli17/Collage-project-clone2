'use client'

import { useState, useEffect } from 'react'
import { Edit2, Save, Upload } from 'lucide-react'
import { useRealtimeVendor } from '../../hooks/useRealtimeVendor'
import { useToast } from '../../hooks/use-toast'
import { getHeaders, API_BASE_URL } from '../../lib/api'
import { VendorLiveLocation } from './vendor-live-location'
import { VendorLocationMap } from './vendor-location-map'

interface ProfileData {
  businessName?: string
  businessType?: string
  businessRegistration?: string
  gstNumber?: string
  businessEmail?: string
  businessAddress?: string
  city?: string
  state?: string
  mobileNumber?: string
  phoneNumber?: string
  businessDescription?: string
  website?: string
  businessLogo?: string
}

export function VendorProfile() {
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData>({
    businessName: '',
    businessType: '',
    businessRegistration: '',
    gstNumber: '',
    businessEmail: '',
    businessAddress: '',
    city: '',
    state: '',
    mobileNumber: '',
    phoneNumber: '',
    businessDescription: '',
    website: '',
    businessLogo: '🏪',
  })

  const [formData, setFormData] = useState<ProfileData>(profileData)
  const { toast } = useToast()

  // Real-time vendor hook
  useRealtimeVendor(
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    // onProfileUpdated
    (profile) => {
      console.log('Profile updated via real-time:', profile)
      if (profile) {
        setProfileData(profile)
        setFormData(profile)
      }
    }
  )

  // Fetch profile on component mount
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vendor/profile`, {
        headers: getHeaders(),
      })

      if (!response.ok) throw new Error('Failed to fetch profile')

      const data = await response.json()
      if (data.success && data.data) {
        setProfileData(data.data)
        setFormData(data.data)
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load profile',
        variant: 'destructive',
      })
    }
  }

  const handleSave = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vendor/profile/update`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to save profile')

      const data = await response.json()
      if (data.success) {
        setProfileData(data.data)
        setIsEditing(false)
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
          variant: 'default',
        })
      }
    } catch (error: any) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save profile',
        variant: 'destructive',
      })
    }
  }

  const handleCancel = () => {
    setFormData(profileData)
    setIsEditing(false)
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Manage your vendor account and business information</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
            isEditing
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Edit2 size={20} />
          {isEditing ? 'Cancel Edit' : 'Edit Profile'}
        </button>
      </div>

      {/* Profile Picture Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 hover:shadow-md transition-all">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Business Logo</h2>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-5xl border-4 border-gray-200">
            {profileData.businessLogo}
          </div>
          {isEditing && (
            <div className="flex-1 space-y-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition font-medium">
                <Upload size={18} />
                Upload New Logo
              </button>
              <p className="text-sm text-gray-600">Recommended: 512x512px, PNG or JPG</p>
            </div>
          )}
        </div>
      </div>

      {/* Business Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 hover:shadow-md transition-all space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Business Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Name *
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profileData.businessName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Type
            </label>
            {isEditing ? (
              <select
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>Electronics Retailer</option>
                <option>Fashion Retailer</option>
                <option>Books & Stationery</option>
                <option>Service Provider</option>
                <option>Food & Beverage</option>
              </select>
            ) : (
              <p className="text-gray-900 font-medium">{profileData.businessType}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GST Number
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profileData.gstNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Registration
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.businessRegistration}
                onChange={(e) => setFormData({ ...formData, businessRegistration: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profileData.businessRegistration}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={formData.businessEmail}
                onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profileData.businessEmail}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profileData.website}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Description
          </label>
          {isEditing ? (
            <textarea
              value={formData.businessDescription}
              onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-700">{profileData.businessDescription}</p>
          )}
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 hover:shadow-md transition-all space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Address & Location</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Address
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profileData.businessAddress}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profileData.city}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profileData.state}</p>
            )}
          </div>
        </div>
      </div>

      {/* Live Location Section */}
      <VendorLiveLocation isEditing={isEditing} />

      {/* Location Map Section */}
      <VendorLocationMap vendorData={profileData} />

      {/* Contact Information */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 hover:shadow-md transition-all space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Contact Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profileData.mobileNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-medium">{profileData.phoneNumber}</p>
            )}
          </div>
        </div>
      </div>

      {/* Account Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 hover:shadow-md transition-all space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Account Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Verification Status</span>
            <span className="px-4 py-1 bg-green-100 text-green-800 rounded-full font-bold text-sm">
              ✓ Verified
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Admin Approval</span>
            <span className="px-4 py-1 bg-green-100 text-green-800 rounded-full font-bold text-sm">
              ✓ Approved
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Account Status</span>
            <span className="px-4 py-1 bg-green-100 text-green-800 rounded-full font-bold text-sm">
              ✓ Active
            </span>
          </div>
        </div>
      </div>

      {/* Save/Cancel Buttons */}
      {isEditing && (
        <div className="flex gap-3 sticky bottom-4 sm:static">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-bold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      )}
    </main>
  )
}
