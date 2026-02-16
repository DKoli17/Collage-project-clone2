import { useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface CouponClaim {
  couponId: string;
  couponCode: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  totalClaims: number;
  maxRedemptions?: number;
  claimedAt: Date;
  timestamp: Date;
  message: string;
}

interface CouponAnalytics {
  totalCoupons: number;
  activeCoupons: number;
  totalCouponClaims: number;
  coupons: any[];
}

interface CouponUpdate {
  couponsAnalytics: CouponAnalytics;
  timestamp: Date;
}

export function useRealtimeCoupons(
  onCouponClaimedUpdated?: (claim: CouponClaim) => void,
  onCouponAnalyticsUpdated?: (update: CouponUpdate) => void,
  onConnectionStatusChange?: (connected: boolean) => void
) {
  const socketRef = useRef<Socket | null>(null);
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
    const userStr = localStorage.getItem('user');
    
    if (!token) {
      console.warn('Missing authentication token for WebSocket');
      isConnectingRef.current = false;
      return;
    }

    let vendorId: string | null = null;
    
    try {
      if (userStr) {
        const user = JSON.parse(userStr);
        vendorId = user.id;
      }
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
      isConnectingRef.current = false;
      return;
    }

    if (!vendorId) {
      console.warn('Missing vendor ID for WebSocket');
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
          userId: vendorId,
          userRole: 'vendor'
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxReconnectAttemptsRef.current,
      });

      socket.on('connect', () => {
        console.log('✅ Coupon WebSocket connected:', socket.id);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        
        // Join vendor room
        socket.emit('vendor:join', vendorId);
        
        onConnectionStatusChange?.(true);
      });

      socket.on('connection:status', (data) => {
        console.log('📡 Coupon connection status:', data);
      });

      // ========== COUPON CLAIM UPDATES ==========
      socket.on('vendor:coupon:claimed', (claim: CouponClaim) => {
        console.log('🎟️ Coupon claimed:', claim);
        onCouponClaimedUpdated?.(claim);
      });

      // ========== COUPON ANALYTICS UPDATES ==========
      socket.on('vendor:coupons:analytics:loaded', (update: CouponUpdate) => {
        console.log('📊 Coupon analytics loaded:', update.couponsAnalytics);
        onCouponAnalyticsUpdated?.(update);
      });

      socket.on('vendor:coupons:analytics:updated', (update: CouponUpdate) => {
        console.log('📈 Coupon analytics updated:', update.couponsAnalytics);
        onCouponAnalyticsUpdated?.(update);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
        onConnectionStatusChange?.(false);
      });

      socket.on('disconnect', () => {
        console.log('❌ Coupon WebSocket disconnected');
        onConnectionStatusChange?.(false);
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to connect Socket:', error);
      isConnectingRef.current = false;
    }
  }, [onCouponClaimedUpdated, onCouponAnalyticsUpdated, onConnectionStatusChange]);

  const requestCouponAnalyticsUpdate = useCallback((vendorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:request-coupons-analytics', vendorId);
      console.log('📤 Requesting coupon analytics for vendor:', vendorId);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected: socketRef.current?.connected || false,
    requestCouponAnalyticsUpdate,
  };
}
