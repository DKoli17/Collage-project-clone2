import { useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface VendorProductUpdate {
  products: any[];
  timestamp: Date;
}

interface VendorOrderUpdate {
  orders: any[];
  pagination: any;
  timestamp: Date;
}

interface VendorAnalyticsUpdate {
  analytics: {
    totalOffers: number;
    activeOffers: number;
    totalRedemptions: number;
    totalDiscount: number;
    offers: any[];
  };
  timestamp: Date;
}

interface VendorDashboardOverview {
  totalOffers: number;
  activeOffers: number;
  totalRedemptions: number;
  totalDiscount: number;
  timestamp: Date;
}

interface VendorNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'pending';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface VendorVerificationUpdate {
  verifications: any[];
  pagination?: any;
  timestamp: Date;
}

interface VendorRevenueUpdate {
  totalRevenue: number;
  accountBalance: number;
  revenueAdded?: number;
  couponCount?: number;
  timestamp: Date;
}

export function useRealtimeVendor(
  onProductsUpdated?: (update: VendorProductUpdate) => void,
  onOrdersUpdated?: (update: VendorOrderUpdate) => void,
  onAnalyticsUpdated?: (update: VendorAnalyticsUpdate) => void,
  onDiscountsUpdated?: (data: any) => void,
  onNotificationsUpdated?: (notifications: VendorNotification[]) => void,
  onOverviewUpdated?: (overview: VendorDashboardOverview) => void,
  onProfileUpdated?: (profile: any) => void,
  onNotificationReceived?: (notification: VendorNotification) => void,
  onConnectionStatusChange?: (connected: boolean) => void,
  onVerificationsUpdated?: (update: VendorVerificationUpdate) => void,
  onCouponClaimed?: (data: any) => void,
  onRevenueUpdated?: (update: VendorRevenueUpdate) => void
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

    let vendorId: string | null = null;
    
    try {
      if (userStr) {
        const user = JSON.parse(userStr);
        vendorId = user.id;
      }
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
    }

    if (!vendorId) {
      console.warn('Missing vendor ID for WebSocket');
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
        transports: ['websocket', 'polling'],
        upgrade: true,
      });

      socket.on('connect', () => {
        console.log('✅ Vendor WebSocket connected:', socket.id);
        reconnectAttemptsRef.current = 0;
        
        // Join vendor room
        socket.emit('vendor:join', vendorId);
        
        onConnectionStatusChange?.(true);
      });

      socket.on('connection:status', (data) => {
        console.log('📡 Vendor connection status:', data);
      });

      // ========== PRODUCTS UPDATES ==========
      socket.on('vendor:products:loaded', (update: VendorProductUpdate) => {
        console.log('📦 Vendor products loaded:', update.products?.length);
        onProductsUpdated?.(update);
      });

      socket.on('vendor:products:updated', (update: VendorProductUpdate) => {
        console.log('🔄 Vendor products updated:', update.products?.length);
        onProductsUpdated?.(update);
      });

      // ========== ORDERS UPDATES ==========
      socket.on('vendor:orders:loaded', (update: VendorOrderUpdate) => {
        console.log('📦 Vendor orders loaded:', update.orders?.length);
        onOrdersUpdated?.(update);
      });

      socket.on('vendor:orders:updated', (update: VendorOrderUpdate) => {
        console.log('🔄 Vendor orders updated:', update.orders?.length);
        onOrdersUpdated?.(update);
      });

      // ========== ANALYTICS UPDATES ==========
      socket.on('vendor:analytics:loaded', (update: VendorAnalyticsUpdate) => {
        console.log('📊 Vendor analytics loaded:', update.analytics);
        onAnalyticsUpdated?.(update);
      });

      socket.on('vendor:analytics:updated', (update: VendorAnalyticsUpdate) => {
        console.log('📈 Vendor analytics updated:', update.analytics);
        onAnalyticsUpdated?.(update);
      });

      // ========== DISCOUNTS UPDATES ==========
      socket.on('vendor:discounts:loaded', (data) => {
        console.log('🏷️ Vendor discounts loaded:', data.discounts?.length);
        onDiscountsUpdated?.(data);
      });

      socket.on('vendor:discounts:updated', (data) => {
        console.log('🔄 Vendor discounts updated:', data.discounts?.length);
        onDiscountsUpdated?.(data);
      });

      // ========== NOTIFICATIONS ==========
      socket.on('vendor:notifications:loaded', (data) => {
        console.log('🔔 Vendor notifications loaded:', data.notifications?.length);
        onNotificationsUpdated?.(data.notifications);
      });

      socket.on('vendor:notifications:updated', (data) => {
        console.log('🔔 Vendor notifications updated:', data.notifications?.length);
        onNotificationsUpdated?.(data.notifications);
      });

      socket.on('vendor:notification:offer-approved', (notification: VendorNotification) => {
        console.log('✅ Offer approved notification:', notification);
        onNotificationReceived?.({ ...notification, type: 'success' });
      });

      socket.on('vendor:notification:offer-rejected', (notification: VendorNotification) => {
        console.log('❌ Offer rejected notification:', notification);
        onNotificationReceived?.({ ...notification, type: 'error' });
      });

      socket.on('vendor:notification:new-redemption', (notification: VendorNotification) => {
        console.log('🎉 New redemption notification:', notification);
        onNotificationReceived?.({ ...notification, type: 'success' });
      });

      socket.on('vendor:notification:product-updated', (notification: VendorNotification) => {
        console.log('📝 Product updated notification:', notification);
        onNotificationReceived?.({ ...notification, type: 'info' });
      });

      // ========== PROFILE UPDATES ==========
      socket.on('vendor:profile:updated', (data) => {
        console.log('👤 Vendor profile updated');
        onProfileUpdated?.(data.vendor);
      });

      // ========== DASHBOARD OVERVIEW ==========
      socket.on('vendor:overview:updated', (overview: VendorDashboardOverview) => {
        console.log('📊 Vendor overview updated:', overview);
        onOverviewUpdated?.(overview);
      });

      // ========== VERIFICATIONS ==========
      socket.on('vendor:verifications:loaded', (update: VendorVerificationUpdate) => {
        console.log('📋 Vendor verifications loaded:', update.verifications?.length);
        onVerificationsUpdated?.(update);
      });

      socket.on('vendor:verifications:updated', (update: VendorVerificationUpdate) => {
        console.log('📋 Vendor verifications updated:', update.verifications?.length);
        onVerificationsUpdated?.(update);
      });

      // ========== COUPON CLAIMS ==========
      socket.on('vendor:coupon-claimed', (data) => {
        console.log('🎉 Coupon claimed real-time update:', data);
        onCouponClaimed?.(data);
      });

      // ========== REVENUE UPDATES ==========
      socket.on('vendor:revenue:loaded', (update: VendorRevenueUpdate) => {
        console.log('💰 Vendor revenue loaded:', update);
        onRevenueUpdated?.(update);
      });

      socket.on('vendor:revenue:updated', (update: VendorRevenueUpdate) => {
        console.log('📈 Vendor revenue updated:', update);
        onRevenueUpdated?.(update);
      });

      socket.on('vendor:coupon-purchased', (data: any) => {
        console.log('🛍️ Coupon purchased in real-time:', data);
        // Trigger revenue update after coupon purchase
        onRevenueUpdated?.({
          totalRevenue: 0, // Will be updated by separate revenue:updated event
          accountBalance: 0,
          revenueAdded: data.totalPrice,
          couponCount: data.quantity,
          timestamp: new Date(),
        });
      });

      // Disconnection
      socket.on('disconnect', () => {
        console.log('❌ Vendor WebSocket disconnected');
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
      console.error('Failed to initialize vendor WebSocket:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      console.log('🔌 Vendor WebSocket disconnected manually');
    }
  }, []);

  // Request data updates
  const requestProductsUpdate = useCallback((vendorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:request-products', vendorId);
    }
  }, []);

  const requestOrdersUpdate = useCallback((vendorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:request-orders', vendorId);
    }
  }, []);

  const requestAnalyticsUpdate = useCallback((vendorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:request-analytics', vendorId);
    }
  }, []);

  const requestDiscountsUpdate = useCallback((vendorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:request-discounts', vendorId);
    }
  }, []);

  const requestNotificationsUpdate = useCallback((vendorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:request-notifications', vendorId);
    }
  }, []);

  const requestVerificationsUpdate = useCallback((vendorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:request-verifications', vendorId);
    }
  }, []);

  const requestRevenueUpdate = useCallback((vendorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:request-revenue', vendorId);
    }
  }, []);

  // Broadcast vendor events
  const broadcastOfferApproved = useCallback((vendorId: string, offerId: string, offerTitle: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:broadcast:offer-approved', { vendorId, offerId, offerTitle });
    }
  }, []);

  const broadcastOfferRejected = useCallback((vendorId: string, offerId: string, offerTitle: string, reason?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:broadcast:offer-rejected', { vendorId, offerId, offerTitle, reason });
    }
  }, []);

  const broadcastNewRedemption = useCallback((vendorId: string, offerId: string, offerTitle: string, studentName: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:broadcast:new-redemption', { vendorId, offerId, offerTitle, studentName });
    }
  }, []);

  const broadcastProductUpdated = useCallback((vendorId: string, productName: string, action: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:broadcast:product-updated', { vendorId, productName, action });
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
    requestProductsUpdate,
    requestOrdersUpdate,
    requestAnalyticsUpdate,
    requestDiscountsUpdate,
    requestNotificationsUpdate,
    requestVerificationsUpdate,
    requestRevenueUpdate,
    broadcastOfferApproved,
    broadcastOfferRejected,
    broadcastNewRedemption,
    broadcastProductUpdated,
    disconnect,
    connect,
  };
}
