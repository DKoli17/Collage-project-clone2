import { useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface StudentUpdate {
  studentId: string;
  approvalStatus?: 'approved' | 'rejected' | 'pending';
  verificationStatus?: 'verified' | 'pending' | 'rejected';
  student: any;
  changedBy: string;
  timestamp: Date;
}

interface VendorUpdate {
  vendorId: string;
  approvalStatus: 'approved' | 'rejected';
  vendor: any;
  timestamp: Date;
}

interface UserDeletion {
  userId: string;
  userType: string;
  deletedBy: string;
  timestamp: Date;
}

interface VendorAnalytics {
  totalOffers: number;
  totalRedemptions: number;
  activeOffers: number;
}

export function useRealtimeUpdates(
  onStudentUpdated?: (update: StudentUpdate) => void,
  onVendorUpdated?: (update: VendorUpdate) => void,
  onUserDeleted?: (deletion: UserDeletion) => void,
  onStudentsUpdated?: (data: any) => void,
  onVendorsUpdated?: (data: any) => void,
  onOffersUpdated?: (data: any) => void,
  onVendorAnalyticsUpdated?: (data: { analytics: VendorAnalytics; timestamp: Date }) => void,
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
      return;
    }

    let userId: string | null = null;
    let userRole: 'admin' | 'vendor' | 'student' = 'student';
    
    try {
      if (userStr) {
        const user = JSON.parse(userStr);
        userId = user.id;
        userRole = user.role || 'student';
      }
    } catch (error) {
      console.error('Failed to parse user from localStorage:', error);
    }

    if (!userId) {
      console.warn('Missing user ID for WebSocket');
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
          userRole
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxReconnectAttemptsRef.current,
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket connected:', socket.id);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0;
        
        // Join appropriate room based on role
        if (userRole === 'admin') {
          socket.emit('admin:join', userId);
        } else if (userRole === 'vendor') {
          socket.emit('vendor:join', userId);
        } else if (userRole === 'student') {
          socket.emit('student:join', userId);
        }
        
        onConnectionStatusChange?.(true);
      });

      socket.on('connection:status', (data) => {
        console.log('📡 Connection status:', data);
      });

      // Student and verification updates
      socket.on('student:status-updated', (update: StudentUpdate) => {
        console.log('📢 Student status update received:', update);
        onStudentUpdated?.(update);
      });

      socket.on('student:verification-updated', (update: StudentUpdate) => {
        console.log('✅ Student verification update received:', update);
        onStudentUpdated?.(update);
      });

      // Batch updates
      socket.on('students:updated', (data) => {
        console.log('📊 Students batch update received:', data.students?.length || 0);
        onStudentsUpdated?.(data);
      });

      socket.on('vendors:updated', (data) => {
        console.log('📊 Vendors batch update received:', data.vendors?.length || 0);
        onVendorsUpdated?.(data);
      });

      socket.on('offers:updated', (data) => {
        console.log('📊 Offers batch update received:', data.offers?.length || 0);
        onOffersUpdated?.(data);
      });

      // Vendor updates
      socket.on('vendor:approval-updated', (update: VendorUpdate) => {
        console.log('📢 Vendor approval update received:', update);
        onVendorUpdated?.(update);
      });

      socket.on('vendor:offers:updated', (data) => {
        console.log('📊 Vendor offers update received:', data.offers?.length || 0);
        onOffersUpdated?.(data);
      });

      socket.on('offer:created', (data) => {
        console.log('✅ Offer created successfully:', data.offer?.title);
        onOffersUpdated?.({ offers: [data.offer], timestamp: data.timestamp });
      });

      socket.on('vendor:analytics:updated', (data) => {
        console.log('📊 Vendor analytics update received:', data);
        onVendorAnalyticsUpdated?.(data);
      });

      // User deletion
      socket.on('user:deleted', (deletion: UserDeletion) => {
        console.log('🗑️ User deleted:', deletion);
        onUserDeleted?.(deletion);
      });

      // Disconnection
      socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        isConnectingRef.current = false;
        onConnectionStatusChange?.(false);
      });

      // Errors
      socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current++;
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      isConnectingRef.current = false;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      isConnectingRef.current = false;
      socketRef.current.disconnect();
      socketRef.current = null;
      console.log('🔌 WebSocket disconnected manually');
    }
  }, []);

  const requestStudentsUpdate = useCallback(() => {
    if (socketRef.current?.connected) {
      const userStr = localStorage.getItem('user');
      try {
        if (userStr) {
          const user = JSON.parse(userStr);
          socketRef.current.emit('admin:request-students', user.id);
        }
      } catch (error) {
        console.error('Failed to get admin ID for request:', error);
      }
    }
  }, []);

  const requestVendorsUpdate = useCallback(() => {
    if (socketRef.current?.connected) {
      const userStr = localStorage.getItem('user');
      try {
        if (userStr) {
          const user = JSON.parse(userStr);
          socketRef.current.emit('admin:request-vendors', user.id);
        }
      } catch (error) {
        console.error('Failed to get admin ID for request:', error);
      }
    }
  }, []);

  const requestOffersUpdate = useCallback(() => {
    if (socketRef.current?.connected) {
      const userStr = localStorage.getItem('user');
      try {
        if (userStr) {
          const user = JSON.parse(userStr);
          socketRef.current.emit('admin:request-offers', user.id);
        }
      } catch (error) {
        console.error('Failed to get admin ID for request:', error);
      }
    }
  }, []);

  const requestVendorOffersUpdate = useCallback((vendorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:request-offers', vendorId);
    }
  }, []);

  const requestVendorAnalytics = useCallback((vendorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:request-analytics', vendorId);
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
    requestOffersUpdate,
    requestVendorOffersUpdate,
    requestVendorAnalytics,
    disconnect,
    connect,
  };
}
