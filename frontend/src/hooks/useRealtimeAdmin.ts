import { useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface AdminStudentUpdate {
  students: any[];
  pagination?: any;
  timestamp: Date;
}

interface AdminVendorUpdate {
  vendors: any[];
  pagination?: any;
  timestamp: Date;
}

interface AdminNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'pending';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface AdminCouponPurchaseUpdate {
  studentId: string;
  studentName: string;
  vendorId: string;
  vendorName: string;
  offerId: string;
  offerTitle: string;
  quantity: number;
  totalRevenue: number;
  timestamp: Date;
}

interface AdminOfferApprovalUpdate {
  offerId: string;
  vendorId: string;
  vendorName: string;
  offerTitle: string;
  action: 'approved' | 'rejected';
  timestamp: Date;
}

export function useRealtimeAdmin(
  onStudentsUpdated?: (update: AdminStudentUpdate) => void,
  onVendorsUpdated?: (update: AdminVendorUpdate) => void,
  onNotificationReceived?: (notification: AdminNotification) => void,
  onConnectionStatusChange?: (connected: boolean) => void,
  onCouponPurchased?: (update: AdminCouponPurchaseUpdate) => void,
  onOfferApprovalChanged?: (update: AdminOfferApprovalUpdate) => void
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

    let adminId: string | null = null;
    
    try {
      if (userStr) {
        const user = JSON.parse(userStr);
        adminId = user.id;
      }
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
    }

    if (!adminId) {
      console.warn('Missing admin ID for WebSocket');
      return;
    }

    try {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 
                       import.meta.env.VITE_API_URL?.replace('/api', '') || 
                       'http://localhost:5000';
      
      const socket = io(socketUrl, {
        auth: {
          token,
          userId: adminId,
          userRole: 'admin'
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxReconnectAttemptsRef.current,
        transports: ['websocket', 'polling'],
        upgrade: true,
      });

      socket.on('connect', () => {
        console.log('✅ Admin WebSocket connected:', socket.id);
        reconnectAttemptsRef.current = 0;
        
        // Join admin room
        socket.emit('admin:join', adminId);
        
        onConnectionStatusChange?.(true);
      });

      socket.on('connection:status', (data) => {
        console.log('📡 Admin connection status:', data);
      });

      // ========== STUDENTS UPDATES ==========
      socket.on('admin:students:loaded', (update: AdminStudentUpdate) => {
        console.log('👥 Admin students loaded:', update.students?.length);
        onStudentsUpdated?.(update);
      });

      socket.on('admin:students:updated', (update: AdminStudentUpdate) => {
        console.log('👥 Admin students updated:', update.students?.length);
        onStudentsUpdated?.(update);
      });

      // ========== VENDORS UPDATES ==========
      socket.on('admin:vendors:loaded', (update: AdminVendorUpdate) => {
        console.log('🏪 Admin vendors loaded:', update.vendors?.length);
        onVendorsUpdated?.(update);
      });

      socket.on('admin:vendors:updated', (update: AdminVendorUpdate) => {
        console.log('🏪 Admin vendors updated:', update.vendors?.length);
        onVendorsUpdated?.(update);
      });

      // ========== COUPON PURCHASES ==========
      socket.on('admin:coupon-purchased', (update: AdminCouponPurchaseUpdate) => {
        console.log('🛍️ Coupon purchased:', update);
        onCouponPurchased?.(update);
        
        // Emit notification
        onNotificationReceived?.({
          id: `purchase-${Date.now()}`,
          type: 'info',
          title: '🛍️ New Coupon Purchase',
          message: `${update.studentName} purchased ${update.quantity} coupon(s) from ${update.vendorName}. Revenue: ₹${update.totalRevenue}`,
          timestamp: new Date(),
          read: false,
        });
      });

      // ========== OFFER APPROVAL CHANGES ==========
      socket.on('admin:offer-approval-changed', (update: AdminOfferApprovalUpdate) => {
        console.log('📋 Offer approval changed:', update);
        onOfferApprovalChanged?.(update);
        
        const notificationType = update.action === 'approved' ? 'success' : 'warning';
        onNotificationReceived?.({
          id: `offer-${update.offerId}-${Date.now()}`,
          type: notificationType,
          title: `Offer ${update.action.charAt(0).toUpperCase() + update.action.slice(1)}`,
          message: `"${update.offerTitle}" from ${update.vendorName} has been ${update.action}`,
          timestamp: new Date(),
          read: false,
        });
      });

      // ========== VERIFICATIONS ==========
      socket.on('admin:new-verification-pending', (data: any) => {
        console.log('📋 New verification pending:', data);
        onNotificationReceived?.({
          id: `verification-${Date.now()}`,
          type: 'warning',
          title: '📋 Pending Verification',
          message: `${data.count || 1} student(s) pending verification`,
          timestamp: new Date(),
          read: false,
        });
      });

      // ========== NOTIFICATIONS ==========
      socket.on('newNotification', (notification: AdminNotification) => {
        console.log('🔔 New notification:', notification);
        onNotificationReceived?.(notification);
      });

      // Disconnection
      socket.on('disconnect', () => {
        console.log('❌ Admin WebSocket disconnected');
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
      console.error('Failed to initialize admin WebSocket:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      console.log('🔌 Admin WebSocket disconnected manually');
    }
  }, []);

  // Request data updates
  const requestStudentsUpdate = useCallback((adminId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('admin:request-students', adminId);
    }
  }, []);

  const requestVendorsUpdate = useCallback((adminId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('admin:request-vendors', adminId);
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
    requestStudentsUpdate,
    requestVendorsUpdate,
    disconnect,
    connect,
  };
}
