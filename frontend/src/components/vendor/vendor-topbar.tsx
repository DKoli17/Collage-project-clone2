'use client'

import { Menu, Search, Bell, User, LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'

interface VendorTopBarProps {
  onMenuClick: () => void
}

export function VendorTopBar({ onMenuClick }: VendorTopBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/vendor/login')
  }

  const getPageTitle = () => {
    const pathname = location.pathname
    
    if (pathname.includes('/dashboard')) return 'Dashboard'
    if (pathname.includes('/discounts')) return 'Student Discounts'
    if (pathname.includes('/coupon-purchases')) return 'Coupon Purchases'
    if (pathname.includes('/coupons')) return 'Coupon Claims'
    if (pathname.includes('/verification')) return 'Student Document Verification'
    if (pathname.includes('/orders')) return 'Orders'
    if (pathname.includes('/revenue')) return 'Revenue & Earnings'
    if (pathname.includes('/analytics')) return 'Analytics & Reports'
    if (pathname.includes('/notifications')) return 'Notifications'
    if (pathname.includes('/profile')) return 'Profile Settings'
    
    return 'Dashboard'
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <Menu size={20} className="text-gray-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {getPageTitle()}
            </h2>
            <p className="text-sm text-gray-500">Manage your vendor account</p>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Search Bar - Desktop Only */}
          <div className="hidden sm:flex items-center bg-gray-100 rounded-lg px-4 py-2 gap-2 w-64">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent outline-none text-sm text-gray-700 flex-1"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition group">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg p-4 hidden group-hover:block z-50">
              <h3 className="font-bold text-gray-900 mb-3">Notifications</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-gray-900">New Order</p>
                  <p className="text-xs text-gray-600 mt-1">You have a new order from a student</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-medium text-gray-900">Verification Request</p>
                  <p className="text-xs text-gray-600 mt-1">New student document verification pending</p>
                </div>
              </div>
            </div>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'V'}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Vendor'}</p>
                <p className="text-xs text-gray-500">Vendor</p>
              </div>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50">
                <button
                  onClick={() => {
                    navigate('/vendor/profile')
                    setShowDropdown(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 border-b border-gray-200 transition"
                >
                  <User size={18} />
                  <span className="text-sm">Profile Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut size={18} />
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
