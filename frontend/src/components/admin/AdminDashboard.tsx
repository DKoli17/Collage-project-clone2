import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UsersIcon, TagIcon, ActivityIcon, UserCheckIcon, AlertCircleIcon, StoreIcon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface ActiveUsersStats {
  totalUsers: number;
  onlineUsers: number;
  offlineUsers: number;
  students: { total: number; online: number; offline: number };
}

interface OffersStats {
  activeOffers: number;
  changePercentage: string;
}

interface VendorStats {
  totalVendors: number;
  liveVendors: number;
  offlineVendors: number;
}

interface PendingOffersData {
  pendingOffers: Array<{
    _id: string;
    title: string;
    vendor: { name: string; businessName: string };
    createdAt: string;
  }>;
  pagination: {
    total: number;
    totalPages: number;
  };
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [activeUsersStats, setActiveUsersStats] = useState<ActiveUsersStats | null>(null);
  const [offersStats, setOffersStats] = useState<OffersStats | null>(null);
  const [vendorStats, setVendorStats] = useState<VendorStats | null>(null);
  const [pendingOffers, setPendingOffers] = useState<PendingOffersData['pendingOffers']>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchActiveUsers(),
          fetchOffersStats(),
          fetchVendorStats(),
          fetchPendingOffers()
        ]);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchActiveUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/active-users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch active users');
      
      const data = await response.json();
      setActiveUsersStats(data.stats);
    } catch (error: any) {
      console.log('Note: Could not fetch active users stats');
    }
  };

  const fetchOffersStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/offers-stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOffersStats(data);
      }
    } catch (error: any) {
      console.log('Note: Could not fetch offers stats');
    }
  };

  const fetchVendorStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/vendor-stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVendorStats(data);
      }
    } catch (error: any) {
      console.log('Note: Could not fetch vendor stats');
    }
  };

  const fetchPendingOffers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/offers/admin/pending?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch pending offers');
      
      const data: PendingOffersData = await response.json();
      setPendingOffers(data.pendingOffers);
      setPendingCount(data.pagination.total);
    } catch (error: any) {
      console.log('Note: Could not fetch pending offers');
    }
  };

  const stats = [
    { label: 'Total Users', value: activeUsersStats?.totalUsers || '0', icon: UsersIcon, bgGradient: 'from-indigo-600 to-indigo-700', iconColor: 'text-indigo-100', change: `${activeUsersStats?.onlineUsers || 0} online` },
    { label: 'Total Students', value: activeUsersStats?.students.total || '0', icon: UsersIcon, bgGradient: 'from-blue-600 to-cyan-600', iconColor: 'text-blue-100', change: `${activeUsersStats?.students.online || 0} online now` },
    { label: 'Total Vendors', value: vendorStats?.totalVendors || '0', icon: StoreIcon, bgGradient: 'from-violet-600 to-purple-600', iconColor: 'text-violet-100', change: `${vendorStats?.liveVendors || 0} live` },
    { label: 'Online Now', value: activeUsersStats?.onlineUsers || '0', icon: UserCheckIcon, bgGradient: 'from-emerald-600 to-teal-600', iconColor: 'text-emerald-100', change: '🟢 Live users' },
    { label: 'Active Offers', value: offersStats?.activeOffers || '-', icon: TagIcon, bgGradient: 'from-orange-600 to-red-600', iconColor: 'text-orange-100', change: offersStats?.changePercentage || '-' },
    { label: 'Pending Approval', value: pendingCount, icon: AlertCircleIcon, bgGradient: 'from-yellow-600 to-orange-600', iconColor: 'text-yellow-100', change: 'Awaiting review' },
  ];

  const pendingActions = [
    { id: 2, title: '23 Verification Requests', description: 'Student IDs waiting for approval', action: 'Review Now', route: '/admin/verifications', urgent: true },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Header Card - Student Inspired */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-2xl shadow-md">
            🛡️
          </div>
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Welcome back, Admin
            </h1>
            <p className="text-gray-600 mt-2">
              Monitor platform activity and manage your users in real-time
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid - Clean Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all p-5 group">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.bgGradient} flex items-center justify-center shadow-md`}>
                <stat.icon className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
            </div>
            <p className="text-gray-600 text-xs font-medium uppercase tracking-wide mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Active Users Breakdown - Student Inspired Layout */}
      {activeUsersStats && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
              <ActivityIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Live Activity</h2>
              <p className="text-xs text-gray-600">Real-time user engagement metrics</p>
            </div>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Students */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <UsersIcon className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">Students</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">{activeUsersStats?.students.online || '0'}</span>
                    <span className="text-xs text-gray-600 ml-2">online now</span>
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" 
                      style={{ width: `${((activeUsersStats?.students.online || 0) / (activeUsersStats?.students.total || 1)) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600">{activeUsersStats?.students.total || 0} total students</p>
                </div>
              </div>

              {/* Total Users */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <UserCheckIcon className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">Total Users</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">{activeUsersStats?.totalUsers || '0'}</span>
                    <span className="text-xs text-gray-600 ml-2">all time</span>
                  </div>
                  <div className="w-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full h-2" />
                  <p className="text-xs text-gray-600">{activeUsersStats?.onlineUsers || 0} currently active</p>
                </div>
              </div>

              {/* Vendors */}
              {vendorStats && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <StoreIcon className="w-4 h-4 text-white" />
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">Vendors</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">{vendorStats.liveVendors || '0'}</span>
                      <span className="text-xs text-gray-600 ml-2">live now</span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full" 
                        style={{ width: `${((vendorStats.liveVendors || 0) / (vendorStats.totalVendors || 1)) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">{vendorStats.totalVendors || 0} total vendors</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Offers & Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Offers for Approval */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircleIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pending Offers for Approval</h2>
              <p className="text-xs text-gray-600">Offers awaiting admin review</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="px-6 py-8 text-center">
                <div className="inline-block animate-spin">⟳</div>
                <p className="text-sm text-gray-600 mt-2">Loading pending offers...</p>
              </div>
            ) : pendingOffers.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-gray-600">✓ All offers approved! No pending items.</p>
              </div>
            ) : (
              pendingOffers.map((offer) => (
                <div key={offer._id} className="px-6 py-4 hover:bg-orange-50 transition-colors flex items-start justify-between gap-4 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{offer.title}</p>
                    <p className="text-xs text-gray-600 mt-1">From: {offer.vendor?.businessName || offer.vendor?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Submitted: {new Date(offer.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/admin/verifications')}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all flex-shrink-0"
                  >
                    Review
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
              <TagIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pending Actions</h2>
              <p className="text-xs text-gray-600">To-do items</p>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingActions.map((action) => (
              <div key={action.id} className={`px-6 py-4 ${action.urgent ? 'bg-red-50 border-l-4 border-l-red-500' : 'bg-orange-50 border-l-4 border-l-orange-500'}`}>
                <h3 className="font-semibold text-gray-900 text-sm">{action.title}</h3>
                <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                <button
                  onClick={() => navigate(action.route)}
                  className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    action.urgent 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  {action.action} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
