import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';
import { AdminDashboard } from './AdminDashboard';
import { AdminStudents } from './AdminStudents';
import { AdminCoupons } from './AdminCoupons';
import { AdminVerifications } from './AdminVerifications';
import { AdminSettings } from './AdminSettings';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminVendorManagement } from './AdminVendors';
import { AdminCouponPurchaseApproval } from './AdminCouponPurchaseApproval';

// Placeholder for AdminUserManagement
const AdminUserManagement = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold">User Management</h2>
    <p className="text-gray-600">User management coming soon...</p>
  </div>
);

export function AdminAppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminTopBar onMenuClick={toggleSidebar} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="px-3 sm:px-6 md:px-8 lg:px-16 py-6 sm:py-8 md:py-12 lg:py-16">
            <Routes>
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/students" element={<AdminStudents />} />
              <Route path="/vendors" element={<AdminVendorManagement />} />
              <Route path="/coupons" element={<AdminCoupons />} />
              <Route path="/coupon-purchases" element={<AdminCouponPurchaseApproval />} />
              <Route path="/verifications" element={<AdminVerifications />} />
              <Route path="/analytics" element={<AdminAnalytics />} />
              <Route path="/user-management" element={<AdminUserManagement />} />
              <Route path="/settings" element={<AdminSettings />} />
              <Route path="/" element={<AdminDashboard />} />
            </Routes>
          </div>
        </main>
        <footer className="border-t border-gray-200 bg-white px-8 py-4 shadow-sm">
          <p className="text-center text-sm text-gray-600">
            © 2025 Student Deals Admin Portal – All Rights Reserved
          </p>
        </footer>
      </div>
    </div>
  );
}
