import { 
  LayoutDashboard, 
  ShoppingBag, 
  Tag, 
  Ticket, 
  Bell, 
  HelpCircle,
  User,
  LogOut,
  Menu,
  X,
  Store,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../stores/authStore'

interface StudentSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  isOpen: boolean
  onToggle: () => void
}

export function StudentSidebar({ activeSection, onSectionChange, isOpen, onToggle }: StudentSidebarProps) {
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    // Add a small delay to ensure state is updated
    setTimeout(() => {
      navigate('/student/login', { replace: true })
    }, 100)
  }

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
    { id: 'vendors', label: 'Browse Vendors', icon: Store, path: '/student/vendors' },
    { id: 'categories', label: 'Categories', icon: Tag, path: '/student/categories' },
    { id: 'my-coupons', label: 'My Coupons', icon: Ticket, path: '/student/coupons' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/student/notifications' },
    { id: 'profile', label: 'Profile', icon: User, path: '/student/profile' },
    { id: 'help-support', label: 'Help & Support', icon: HelpCircle, path: '/student/help-support' },
  ]

  const handleMenuClick = (item: typeof menuItems[0]) => {
    onSectionChange(item.id)
    navigate(item.path)
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1024) {
      onToggle()
    }
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-40 lg:hidden p-2 hover:bg-gray-100 rounded-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative w-64 h-screen bg-white border-r border-gray-200 z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <ShoppingBag className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">StudiSave</h1>
              <p className="text-xs text-gray-600">Student Discounts</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-2 overflow-y-auto flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-600 border-l-4 border-purple-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-gray-200">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-lg transition-all duration-200 text-red-600">
            <LogOut size={20} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
