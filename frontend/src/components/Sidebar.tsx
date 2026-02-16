import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboardIcon, TagIcon, ShieldCheckIcon, UserIcon, LogOutIcon, XIcon, SparklesIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { useAuthStore } from '../stores/authStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export function Sidebar({ isOpen, onClose, isMobile }: SidebarProps) {
  const { logout, user } = useAuthStore();
  const { savedItems } = useSavedStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/student/dashboard', icon: LayoutDashboardIcon, label: 'Home', emoji: '🏠', badge: null },
    { to: '/student/marketplace', icon: TagIcon, label: 'Browse Vendors', emoji: '🛍️', badge: null },
    { to: '/student/my-coupons', icon: TagIcon, label: 'My Coupons', emoji: '🎟️', badge: null },
    { to: '/student/profile', icon: UserIcon, label: 'Profile', emoji: '👤', badge: null },
  ];

  if (!isOpen && !isMobile) return null;

  return (
    <>
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          ${isMobile ? 'fixed' : 'relative'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isMobile ? 'z-50' : 'z-10'}
          w-56 sm:w-72 h-full bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-blue-950 border-r border-blue-200 dark:border-blue-900
          transition-transform duration-300 ease-in-out
          flex flex-col shadow-xl overflow-hidden
        `}
        role="navigation"
        aria-label="Sidebar navigation"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse flex-shrink-0">
              <SparklesIcon className="w-5 h-5 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block truncate">
                Student Deals
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400 block truncate">Your savings hub 💰</span>
            </div>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="bg-transparent text-foreground hover:bg-blue-100 dark:hover:bg-blue-900 h-10 w-10 flex-shrink-0"
            >
              <XIcon className="w-5 h-5" strokeWidth={2} />
            </Button>
          )}
        </div>

        {/* User Info Card */}
        <div className="px-4 sm:px-6 mb-4 sm:mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-3 sm:p-4 shadow-lg">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center text-lg sm:text-2xl font-bold text-blue-600 shadow-md flex-shrink-0">
                {user?.name?.split(' ').map(n => n[0]).join('') || 'ST'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-white truncate">{user?.name || 'Student'}</p>
                <p className="text-xs text-blue-100 truncate">{user?.university || 'University'}</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 sm:px-4 py-2 overflow-y-auto" aria-label="Main menu">
          <ul className="space-y-1 sm:space-y-2" role="list">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={isMobile ? onClose : undefined}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all cursor-pointer group text-sm sm:text-base
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 hover:scale-105'
                    }`
                  }
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="text-lg sm:text-xl flex-shrink-0">{item.emoji}</span>
                    <span className="font-medium truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs flex-shrink-0">
                      {item.badge}
                    </Badge>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-2 sm:px-4 py-4 sm:py-6">
          <Separator className="mb-3 sm:mb-4" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 w-full rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer group text-sm sm:text-base"
          >
            <LogOutIcon className="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0" strokeWidth={2} />
            <span className="font-medium">Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

