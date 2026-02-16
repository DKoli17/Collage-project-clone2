import { useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface CouponPurchaseSuccess {
  purchases: Array<{
    _id: string;
    couponCode: string;
    status: string;
    expiryDate: Date;
    discountValue: number;
    discountType: 'percentage' | 'fixed';
    platformSellingPrice: number;
  }>;
  message: string;
  timestamp: Date;
  notificationType: 'coupon-purchase';
}

interface CouponRedeemed {
  couponCode: string;
  status: string;
  message: string;
  discountApplied: string;
  timestamp: Date;
  notificationType: 'coupon-redeemed';
}

interface AvailabilityUpdate {
  offerId: string;
  vendorId: string;
  availableQuantity: number;
  message: string;
  timestamp: Date;
  notificationType: 'availability-change';
}

interface CouponUpdate {
  offerId: string;
  vendorId: string;
  availableQuantity: number;
  message: string;
  timestamp: Date;
  notificationType: 'availability-change';
}

export function useRealtimeStudentCoupons(
  onPurchaseSuccess?: (purchase: CouponPurchaseSuccess) => void,
  onCouponRedeemed?: (coupon: CouponRedeemed) => void,
  onAvailabilityChanged?: (update: AvailabilityUpdate) => void,
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
      console.warn('Missing authentication token for coupon WebSocket');
      isConnectingRef.current = false;
      return;
    }

    let studentId: string | null = null;

    try {
      if (userStr) {
        const user = JSON.parse(userStr);
        studentId = user.id;
      }
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
      isConnectingRef.current = false;
      return;
    }

    if (!studentId) {
      console.warn('Missing student ID for coupon WebSocket');
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
          userId: studentId,
          userRole: 'student',
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxReconnectAttemptsRef.current,
      });

      socket.on('connect', () => {
        console.log('✅ Student Coupon WebSocket connected:', socket.id);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;

        // Join student-specific coupon room
        socket.emit('student:coupon-join', studentId);

        onConnectionStatusChange?.(true);
      });

      socket.on('connection:status', (data) => {
        console.log('📡 Coupon connection status:', data);
      });

      // Listen for purchase success events
      socket.on('coupon:purchase-success', (data: CouponPurchaseSuccess) => {
        console.log('🎉 Coupon purchase success received:', data);
        onPurchaseSuccess?.(data);
      });

      // Listen for coupon redemption events
      socket.on('coupon:redeemed-success', (data: CouponRedeemed) => {
        console.log('✅ Coupon redeemed success received:', data);
        onCouponRedeemed?.(data);
      });

      // Listen for availability changes
      socket.on('student:coupon-availability-updated', (data: CouponUpdate) => {
        console.log('📊 Coupon availability updated:', data);
        onAvailabilityChanged?.(data as AvailabilityUpdate);
      });

      // Listen for coupon purchase room joined
      socket.on('coupon:room-joined', (data) => {
        console.log('📌 Joined coupon purchase room:', data);
      });

      socket.on('error', (error) => {
        console.error('Coupon WebSocket error:', error);
      });

      socket.on('disconnect', () => {
        console.log('❌ Student Coupon WebSocket disconnected');
        onConnectionStatusChange?.(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Coupon connection error:', error);
        if (reconnectAttemptsRef.current < maxReconnectAttemptsRef.current) {
          reconnectAttemptsRef.current++;
          console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttemptsRef.current}`);
        }
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to create coupon WebSocket connection:', error);
      isConnectingRef.current = false;
    }
  }, [onPurchaseSuccess, onCouponRedeemed, onAvailabilityChanged, onConnectionStatusChange]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      console.log('🔌 Coupon WebSocket disconnected');
    }
  }, []);

  const joinCouponRoom = useCallback((studentId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('student:coupon-join', studentId);
      console.log(`📌 Joined coupon room for student: ${studentId}`);
    }
  }, []);

  const requestCouponUpdates = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('student:request-coupons');
      console.log('🔄 Requested coupon updates');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connected: socketRef.current?.connected ?? false,
    disconnect,
    joinCouponRoom,
    requestCouponUpdates,
  };
}
