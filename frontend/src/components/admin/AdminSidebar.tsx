import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboardIcon, UsersIcon, TagIcon, ShieldCheckIcon, TrendingUpIcon, XIcon, ShieldIcon, StoreIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuthStore } from '../../stores/authStore';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export function AdminSidebar({ isOpen, onClose, isMobile }: AdminSidebarProps) {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 100);
  };

  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboardIcon, label: 'Dashboard', emoji: '🏠', badge: null },
    { to: '/admin/students', icon: UsersIcon, label: 'Students', emoji: '🎓', badge: '1.2K' },
    { to: '/admin/vendors', icon: StoreIcon, label: 'Vendors', emoji: '🏪', badge: 'Manage' },
    { to: '/admin/coupons', icon: TagIcon, label: 'Coupons', emoji: '🎟️', badge: 'Pending' },
    { to: '/admin/coupon-purchases', icon: TagIcon, label: 'Coupon Purchases', emoji: '⏳', badge: 'Verify' },
    { to: '/admin/verifications', icon: ShieldCheckIcon, label: 'Verifications', emoji: '✅', badge: '23' },
    { to: '/admin/analytics', icon: TrendingUpIcon, label: 'Analytics', emoji: '📈', badge: null },
  ];

  if (!isOpen && !isMobile) return null;

  return (
    <>
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          ${isMobile ? 'fixed' : 'relative'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isMobile ? 'z-50' : 'z-10'}
          w-72 h-full bg-gradient-to-b from-white to-gray-50 border-r border-gray-200
          transition-transform duration-300 ease-in-out
          flex flex-col shadow-lg
        `}
      >
        <div className="flex items-center justify-between px-6 py-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <ShieldIcon className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent block">
                Admin Panel
              </span>
              <span className="text-xs text-gray-600">Control Center</span>
            </div>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="bg-transparent text-gray-700 hover:bg-gray-100"
            >
              <XIcon className="w-6 h-6" strokeWidth={2} />
            </Button>
          )}
        </div>

        {/* Admin Info Card */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-md">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Administrator'}</p>
                <p className="text-xs text-gray-600 truncate">{user?.email || 'admin@studentdeals.com'}</p>
              </div>
            </div>
            <Badge className="w-full justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
              🛡️ Super Admin
            </Badge>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={isMobile ? onClose : undefined}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer
                    ${isActive 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.emoji}</span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge className="bg-red-100 text-red-700 border-0">
                      {item.badge}
                    </Badge>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-4 py-6 border-t border-gray-200">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => navigate('/admin/settings')}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
              >
                <span className="text-xl">⚙️</span>
                <span className="font-medium">Settings</span>
              </button>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 transition-all cursor-pointer"
              >
                <span className="text-xl">🚪</span>
                <span className="font-medium">Log out</span>
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}
