import { useState, useEffect } from 'react';
import { Search, AlertCircle, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { getAllVendors } from '../../lib/marketplaceAPI';
import { CreateStudentCouponDialog } from './create-student-coupon-dialog';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

interface Vendor {
  _id: string;
  name: string;
  businessName: string;
}

export function StudentVendorsSimple() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);

  const fetchVendors = async () => {
    try {
      setError(null);
      setLoading(true);
      const response = await getAllVendors({
        search: search || undefined,
        limit: 50,
      });

      if (response?.vendors) {
        setVendors(response.vendors);
      } else {
        setError('Unexpected response format from server');
        setVendors([]);
      }
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      setError(error.message || 'Failed to fetch vendors');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [search]);

  // Set up Socket.io for real-time updates
  useEffect(() => {
    let socket: any = null;

    try {
      socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'],
        upgrade: true,
      });

      socket.on('connect', () => {
        setSocketConnected(true);
        fetchVendors();
      });

      socket.on('disconnect', () => {
        setSocketConnected(false);
      });

      socket.on('vendors:updated', () => {
        fetchVendors();
      });

      socket.on('coupon:created', () => {
        fetchVendors();
      });
    } catch (error) {
      console.warn('Socket.io initialization warning:', error);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const handleCreateCoupon = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsCouponDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsCouponDialogOpen(false);
    setSelectedVendor(null);
  };

  const handleCouponCreated = () => {
    handleDialogClose();
    fetchVendors();
  };

  return (
    <div className="w-full">
      {/* Real-time Status Indicator */}
      <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-300 ${
        socketConnected 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-md shadow-green-100' 
          : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 shadow-md shadow-amber-100'
      }`}>
        <div className={`flex items-center gap-2`}>
          {socketConnected ? (
            <>
              <Zap className="w-4 h-4 text-green-600 animate-pulse" />
              <span className="text-xs font-bold text-green-700">⚡ Live Real-Time Updates</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></div>
              <span className="text-xs font-bold text-amber-700">🔄 Reconnecting...</span>
            </>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🏪 Select Vendor & Create Coupon</h1>
        <p className="text-gray-600">
          Choose a vendor and create your own coupon with custom discount
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          <p className="text-red-800"><strong>Error:</strong> {error}</p>
          <button 
            onClick={fetchVendors}
            className="mt-2 text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Vendors Grid - Simple View with only Names */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vendors Found</h3>
          <p className="text-gray-600">
            {search ? 'Try adjusting your search term' : 'No vendors available at the moment'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor) => (
            <div
              key={vendor._id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300"
            >
              {/* Vendor Name */}
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {vendor.businessName || vendor.name}
              </h3>

              {/* Create Coupon Button */}
              <Button
                onClick={() => handleCreateCoupon(vendor)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-lg transition-all"
              >
                ➕ Create Coupon
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create Coupon Dialog */}
      {selectedVendor && (
        <CreateStudentCouponDialog
          vendor={selectedVendor}
          isOpen={isCouponDialogOpen}
          onClose={handleDialogClose}
          onSuccess={handleCouponCreated}
        />
      )}
    </div>
  );
}
