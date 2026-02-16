import { useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface StudentCoupon {
  _id: string;
  couponCode: string;
  offerTitle: string;
  discountValue: number;
  discountType: string;
  status: string;
  expiryDate: string;
  platformSellingPrice: number;
  paidAt: string;
}

interface StudentNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'pending';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface StudentCouponsUpdate {
  coupons: StudentCoupon[];
  pagination?: any;
  timestamp: Date;
}

interface StudentOffersUpdate {
  offers: any[];
  pagination?: any;
  timestamp: Date;
}

interface StudentApprovalUpdate {
  status: 'pending' | 'approved' | 'rejected';
  message: string;
  remarks?: string;
  timestamp: Date;
}

export function useRealtimeStudent(
  onCouponsUpdated?: (update: StudentCouponsUpdate) => void,
  onOffersUpdated?: (update: StudentOffersUpdate) => void,
  onNotificationReceived?: (notification: StudentNotification) => void,
  onConnectionStatusChange?: (connected: boolean) => void,
  onApprovalStatusChanged?: (update: StudentApprovalUpdate) => void,
  onCouponPurchaseSuccess?: (data: any) => void,
  onCouponRedeemed?: (data: any) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttemptsRef = useRef(5);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('user');
    
    if (!token) {
      console.warn('Missing authentication token for WebSocket');
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
    }

    if (!studentId) {
      console.warn('Missing student ID for WebSocket');
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
          userRole: 'student'
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxReconnectAttemptsRef.current,
        transports: ['websocket', 'polling'],
        upgrade: true,
      });

      socket.on('connect', () => {
        console.log('✅ Student WebSocket connected:', socket.id);
        reconnectAttemptsRef.current = 0;
        
        // Join student room
        socket.emit('student:join', studentId);
        
        onConnectionStatusChange?.(true);
      });

      socket.on('connection:status', (data) => {
        console.log('📡 Student connection status:', data);
      });

      // ========== COUPONS UPDATES ==========
      socket.on('student:coupons:loaded', (update: StudentCouponsUpdate) => {
        console.log('🎟️ Student coupons loaded:', update.coupons?.length);
        onCouponsUpdated?.(update);
      });

      socket.on('student:coupons:updated', (update: StudentCouponsUpdate) => {
        console.log('🔄 Student coupons updated:', update.coupons?.length);
        onCouponsUpdated?.(update);
      });

      socket.on('student:coupon-purchased', (data: any) => {
        console.log('✅ Coupon purchased:', data);
        onCouponPurchaseSuccess?.(data);
        // Also update coupons list
        if (data.coupon) {
          const update: StudentCouponsUpdate = {
            coupons: [data.coupon],
            timestamp: new Date(),
          };
          onCouponsUpdated?.(update);
        }
      });

      socket.on('student:coupon-redeemed', (data: any) => {
        console.log('🎉 Coupon redeemed:', data);
        onCouponRedeemed?.(data);
      });

      // ========== OFFERS UPDATES ==========
      socket.on('student:offers:loaded', (update: StudentOffersUpdate) => {
        console.log('📦 Student offers loaded:', update.offers?.length);
        onOffersUpdated?.(update);
      });

      socket.on('student:offers:updated', (update: StudentOffersUpdate) => {
        console.log('📦 Student offers updated:', update.offers?.length);
        onOffersUpdated?.(update);
      });

      socket.on('student:new-offers-available', (data: any) => {
        console.log('🆕 New offers available:', data.count);
        onNotificationReceived?.({
          id: `offer-${Date.now()}`,
          type: 'info',
          title: 'New Offers Available',
          message: `${data.count} new offers available for you`,
          timestamp: new Date(),
          read: false,
        });
      });

      // ========== APPROVAL STATUS ==========
      socket.on('student:approval-status:updated', (update: StudentApprovalUpdate) => {
        console.log('📋 Student approval status updated:', update.status);
        onApprovalStatusChanged?.(update);
        
        const notificationType = update.status === 'approved' ? 'success' : update.status === 'rejected' ? 'error' : 'info';
        onNotificationReceived?.({
          id: `approval-${Date.now()}`,
          type: notificationType,
          title: `Application ${update.status.charAt(0).toUpperCase() + update.status.slice(1)}`,
          message: update.message,
          timestamp: new Date(),
          read: false,
        });
      });

      // ========== NOTIFICATIONS ==========
      socket.on('newNotification', (notification: StudentNotification) => {
        console.log('🔔 New notification:', notification);
        onNotificationReceived?.(notification);
      });

      socket.on('student:notification:coupon-approved', (notification: StudentNotification) => {
        console.log('✅ Coupon approved notification:', notification);
        onNotificationReceived?.({ ...notification, type: 'success' });
      });

      socket.on('student:notification:offer-expired', (notification: StudentNotification) => {
        console.log('⏰ Offer expired notification:', notification);
        onNotificationReceived?.({ ...notification, type: 'warning' });
      });

      socket.on('student:notification:new-redemption-opportunity', (notification: StudentNotification) => {
        console.log('🎯 New redemption opportunity:', notification);
        onNotificationReceived?.({ ...notification, type: 'info' });
      });

      // Disconnection
      socket.on('disconnect', () => {
        console.log('❌ Student WebSocket disconnected');
        onConnectionStatusChange?.(false);
      });

      // Errors
      socket.on('error', (error) => {
        console.warn('WebSocket error (non-blocking):', error);
      });

      socket.on('connect_error', (error) => {
        console.warn('Connection error (attempting reconnect):', error.message);
        reconnectAttemptsRef.current++;
        
        if (reconnectAttemptsRef.current >= maxReconnectAttemptsRef.current) {
          console.warn('Max reconnection attempts reached. Real-time updates may not work.');
          onConnectionStatusChange?.(false);
        }
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to initialize student WebSocket:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      console.log('🔌 Student WebSocket disconnected manually');
    }
  }, []);

  // Request data updates
  const requestCouponsUpdate = useCallback((studentId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('student:request-coupons', studentId);
    }
  }, []);

  const requestOffersUpdate = useCallback((studentId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('student:request-offers', studentId);
    }
  }, []);

  const requestApprovalStatus = useCallback((studentId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('student:request-approval-status', studentId);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected: socketRef.current?.connected || false,
    requestCouponsUpdate,
    requestOffersUpdate,
    requestApprovalStatus,
    disconnect,
    connect,
  };
}
