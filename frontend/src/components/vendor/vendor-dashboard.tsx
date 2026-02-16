'use client'

import { useState, useEffect } from 'react'
import { VendorSidebar } from './vendor-sidebar'
import { VendorTopBar } from './vendor-topbar'
import { VendorDashboardOverview } from './vendor-dashboard-overview'
import { VendorProfile } from './vendor-profile'
import { VendorProducts } from './vendor-products'
import { VendorDiscounts } from './vendor-discounts'
import { StudentVerification } from './student-verification'
import { VendorOrders } from './vendor-orders'
import { VendorAnalytics } from './vendor-analytics'
import { VendorNotifications } from './vendor-notifications'
import { VendorCouponPurchases } from './vendor-coupon-purchases'
import { VendorCouponPurchaseRequests } from './vendor-coupon-purchase-requests'
import { VendorCouponRedemption } from './vendor-coupon-redemption'
import { VendorRevenueAnalytics } from './vendor-revenue-dashboard'
import { useAuthStore } from '../../stores/authStore'
import { useNavigate } from 'react-router-dom'

export function VendorDashboard() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'vendor') {
      navigate('/vendor/login')
    }
  }, [isAuthenticated, user, navigate])

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) setSidebarOpen(false)
      else setSidebarOpen(true)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!isAuthenticated) return null

  const renderContentForPath = () => {
    const path = window.location.pathname || ''
    if (path.includes('/vendor/profile')) return <VendorProfile />
    if (path.includes('/vendor/discounts')) return <VendorDiscounts />
    if (path.includes('/vendor/coupons')) return <VendorCouponPurchases />
    if (path.includes('/vendor/coupon-purchases')) return <VendorCouponPurchaseRequests />
    if (path.includes('/vendor/coupon-redemption')) return <VendorCouponRedemption />
    if (path.includes('/vendor/revenue')) return <VendorRevenueAnalytics />
    if (path.includes('/vendor/analytics')) return <VendorAnalytics />
    if (path.includes('/vendor/notifications')) return <VendorNotifications />
    if (path.includes('/vendor/orders')) return <VendorOrders />
    // default
    return <VendorDashboardOverview />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <VendorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <VendorTopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="px-3 sm:px-6 md:px-8 lg:px-16 py-6 sm:py-8 md:py-12 lg:py-16">
            {renderContentForPath()}
          </div>
        </main>
      </div>
    </div>
  )
}
