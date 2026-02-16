'use client'

import {
  LayoutDashboard,
  User,
  Package,
  Percent,
  FileCheck,
  ShoppingCart,
  BarChart3,
  Bell,
  LogOut,
  Ticket,
  Store,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useNavigate, useLocation } from 'react-router-dom'

interface VendorSidebarProps {
  isOpen: boolean
  onClose: () => void
  isMobile: boolean
}

export function VendorSidebar({ isOpen, onClose, isMobile }: VendorSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/vendor/login')
  }

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview & stats',
      path: '/vendor/dashboard',
    },

    {
      id: 'discounts',
      label: 'Discounts',
      icon: Percent,
      description: 'Set discounts',
      path: '/vendor/discounts',
    },
    {
      id: 'coupons',
      label: 'Coupons',
      icon: ShoppingCart,
      description: 'Coupon purchases & revenue',
      path: '/vendor/coupons',
    },
    {
      id: 'coupon-purchases',
      label: 'Coupon Purchases',
      icon: ShoppingCart,
      description: 'Student purchases',
      path: '/vendor/coupon-purchases',
    },
    {
      id: 'revenue',
      label: 'Revenue',
      icon: Store,
      description: 'Revenue & earnings',
      path: '/vendor/revenue',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Reports & stats',
      path: '/vendor/analytics',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'Messages',
      path: '/vendor/notifications',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Edit profile',
      path: '/vendor/profile',
    },
  ]

  const getActivePath = () => {
    return location.pathname
  }

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            {isOpen && (
              <div>
                <h1 className="font-bold text-gray-900 text-sm">VendorHub</h1>
                <p className="text-xs text-gray-500">Vendor Portal</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = getActivePath().includes(item.path)
          return (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.path)
                onClose()
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={20} className="flex-shrink-0" />
              {isOpen && (
                <div className="text-left">
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium"
        >
          <LogOut size={20} />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-24'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {isMobile && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden transition-opacity ${
              isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={onClose}
          />
          <aside
            className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 lg:hidden transform transition-transform duration-300 ${
              isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
