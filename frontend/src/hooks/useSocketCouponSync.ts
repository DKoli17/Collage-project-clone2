import { useEffect, useCallback, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export interface RealtimeCoupon {
  _id: string;
  code: string;
  vendorId: string;
  vendorName: string;
  studentId?: string;
  studentName?: string;
  amountPaid: number;
  issueDate: string;
  expiryDate: string;
  status: 'active' | 'used' | 'expired';
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  description?: string;
  timestamp: Date;
}

export interface CouponUpdate {
  coupon: RealtimeCoupon;
  action: 'created' | 'updated' | 'redeemed';
  timestamp: Date;
}

export function useSocketCouponSync(userRole: 'student' | 'vendor', userId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newCoupons, setNewCoupons] = useState<RealtimeCoupon[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttemptsRef = useRef(5);
  const isConnectingRef = useRef(false);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (socketRef.current?.connected || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;

    const token = localStorage.getItem('auth_token');

    if (!token || !userId) {
      console.warn('Missing authentication token or user ID for WebSocket');
      isConnectingRef.current = false;
      return;
    }

    try {
      const socketUrl = import.meta.env.VITE_SOCKET_URL ||
        import.meta.env.VITE_API_URL?.replace('/api', '') ||
        'http://localhost:5000';

      const socket = io(socketUrl, {
        auth: {
          token,
          userId,
          userRole,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxReconnectAttemptsRef.current,
      });

      socket.on('connect', () => {
        console.log(`✅ Coupon Sync WebSocket connected (${userRole}):`, socket.id);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        setIsConnected(true);

        // Join appropriate room based on user role
        if (userRole === 'student') {
          socket.emit('student:join', userId);
        } else if (userRole === 'vendor') {
          socket.emit('vendor:join', userId);
        }
      });

      socket.on('disconnect', () => {
        console.log(`❌ Coupon Sync WebSocket disconnected (${userRole})`);
        setIsConnected(false);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
        setIsConnected(false);
      });

      // ========== COUPON CREATION (for vendors to see new student coupons) ==========
      socket.on('coupon:created', (data: RealtimeCoupon) => {
        console.log('🎟️ New coupon created (broadcast):', data);
        if (userRole === 'vendor') {
          setNewCoupons((prev) => {
            // Check if coupon already exists
            const exists = prev.some((c) => c._id === data._id);
            if (!exists) {
              return [data, ...prev];
            }
            return prev;
          });
        }
      });

      // ========== VENDOR-SPECIFIC COUPON UPDATES ==========
      socket.on('vendor:coupon:created', (data: CouponUpdate) => {
        console.log('🎟️ Vendor-specific coupon created:', data);
        if (userRole === 'vendor' && data.coupon.vendorId === userId) {
          setNewCoupons((prev) => {
            const exists = prev.some((c) => c._id === data.coupon._id);
            if (!exists) {
              return [data.coupon, ...prev];
            }
            return prev;
          });
        }
      });

      // ========== STUDENT-SPECIFIC COUPON UPDATES ==========
      socket.on('student:coupon:created', (data: CouponUpdate) => {
        console.log('🎟️ Student coupon created:', data);
        if (userRole === 'student' && data.coupon.studentId === userId) {
          setNewCoupons((prev) => {
            const exists = prev.some((c) => c._id === data.coupon._id);
            if (!exists) {
              return [data.coupon, ...prev];
            }
            return prev;
          });
        }
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to connect Socket:', error);
      isConnectingRef.current = false;
    }
  }, [userRole, userId]);

  const disconnect = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (userId && userRole) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, userRole, connect, disconnect]);

  return {
    isConnected,
    newCoupons,
    setNewCoupons,
    socket: socketRef.current,
  };
}
