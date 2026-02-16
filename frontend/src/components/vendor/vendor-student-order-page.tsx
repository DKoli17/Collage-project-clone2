'use client'

import { useState, useEffect } from 'react'
import { VendorSidebar } from './vendor-sidebar'
import { VendorTopBar } from './vendor-topbar'
import { VendorOrders } from './vendor-orders'
import { useAuthStore } from '../../stores/authStore'
import { useNavigate } from 'react-router-dom'

export function VendorStudentOrderPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const activeTab = 'orders'

  const handleTabChange = (tab: string) => {
    if (tab === 'discounts') {
      navigate('/vendor/studentdiscounts')
    } else if (tab === 'verification') {
      navigate('/vendor/studentdiscountverification')
    } else if (tab === 'orders') {
      navigate('/vendor/studentorder')
    } else {
      navigate('/vendor/dashboard', { state: { activeTab: tab } })
    }
  }

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'vendor') {
      navigate('/vendor/login')
    }
  }, [isAuthenticated, user, navigate])

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <VendorSidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <VendorTopBar 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          currentTab={activeTab}
        />
        <main className="flex-1 overflow-auto">
          <VendorOrders />
        </main>
      </div>
    </div>
  )
}
