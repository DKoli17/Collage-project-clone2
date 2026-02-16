import { useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface VendorData {
  _id: string;
  email: string;
  name: string;
  businessName: string;
  businessType: string;
  mobileNumber: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  isActive: boolean;
  isSuspended: boolean;
  createdAt: string;
}

interface VendorStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  verified: number;
  suspended: number;
}

interface AdminVendorMessage {
  vendorId: string;
  vendorName: string;
  message: string;
  messageType: 'info' | 'warning' | 'success' | 'error';
  timestamp: Date;
}

interface VendorApprovalUpdate {
  vendorId: string;
  vendorName: string;
  status: 'approved' | 'rejected' | 'pending';
  timestamp: Date;
}

interface VendorSuspensionUpdate {
  vendorId: string;
  vendorName: string;
  suspended: boolean;
  timestamp: Date;
}

interface VendorVerificationUpdate {
  vendorId: string;
  vendorName: string;
  verificationStatus: 'verified' | 'pending' | 'rejected';
  timestamp: Date;
}

interface VendorProfileUpdate {
  vendorId: string;
  vendorName: string;
  updatedFields: any;
  timestamp: Date;
}

interface OnlineVendor {
  vendorId: string;
  isOnline: boolean;
}

export function useVendorAdmin(
  onVendorsLoaded?: (data: { vendors: VendorData[]; stats: VendorStats; timestamp: Date }) => void,
  onVendorMessageReceived?: (message: AdminVendorMessage) => void,
  onVendorApprovalChanged?: (update: VendorApprovalUpdate) => void,
  onVendorSuspensionChanged?: (update: VendorSuspensionUpdate) => void,
  onVendorVerificationChanged?: (update: VendorVerificationUpdate) => void,
  onVendorProfileUpdated?: (update: VendorProfileUpdate) => void,
  onOnlineVendorsUpdated?: (data: { onlineVendors: OnlineVendor[]; onlineCount: number; timestamp: Date }) => void,
  onConnectionStatusChange?: (connected: boolean) => void,
  onVendorMessageSent?: (data: any) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);

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
          userRole: 'admin',
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('✅ Admin connected to vendor real-time service');
        reconnectAttemptsRef.current = 0;
        socket.emit('admin:join', adminId);
        onConnectionStatusChange?.(true);
      });

      socket.on('connection:status', (data) => {
        console.log('📡 Connection status:', data);
      });

      // Receive vendors list with stats
      socket.on('admin:vendors:loaded', (data) => {
        console.log('📤 Received vendors list:', data.vendors.length);
        onVendorsLoaded?.(data);
      });

      // Receive vendor approval status changes
      socket.on('admin:vendor-approval:updated', (update) => {
        console.log(`📢 Vendor ${update.vendorId} approval status changed to ${update.status}`);
        onVendorApprovalChanged?.(update);
      });

      // Receive vendor suspension changes
      socket.on('admin:vendor-suspension:updated', (update) => {
        console.log(`📢 Vendor ${update.vendorId} suspension status changed to ${update.suspended}`);
        onVendorSuspensionChanged?.(update);
      });

      // Receive vendor verification status changes
      socket.on('admin:vendor-verification:updated', (update) => {
        console.log(`📢 Vendor ${update.vendorId} verification status changed to ${update.verificationStatus}`);
        onVendorVerificationChanged?.(update);
      });

      // Receive messages from vendors
      socket.on('admin:vendor-message', (message) => {
        console.log(`📨 Received message from vendor ${message.vendorId}: ${message.message}`);
        onVendorMessageReceived?.(message);
      });

      // Vendor profile updates
      socket.on('admin:vendor-profile-updated', (update) => {
        console.log(`📢 Vendor ${update.vendorId} profile updated`);
        onVendorProfileUpdated?.(update);
      });

      // Online vendors list
      socket.on('admin:online-vendors', (data) => {
        console.log(`📤 ${data.onlineCount} vendors online`);
        onOnlineVendorsUpdated?.(data);
      });

      // Message sent confirmation
      socket.on('admin:message-sent', (data) => {
        console.log('✅ Message sent to vendor');
        onVendorMessageSent?.(data);
      });

      socket.on('disconnect', () => {
        console.log('❌ Admin disconnected from vendor real-time service');
        onConnectionStatusChange?.(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reconnectAttemptsRef.current++;
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to connect to vendor real-time service:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // Request vendors list from server
  const requestVendors = useCallback((adminId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('admin:request-vendors', adminId);
    }
  }, []);

  // Send message to specific vendor
  const sendMessageToVendor = useCallback((vendorId: string, vendorName: string, message: string, messageType: 'info' | 'warning' | 'success' | 'error' = 'info') => {
    if (socketRef.current?.connected) {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};
      
      socketRef.current.emit('admin:send-message-to-vendor', {
        vendorId,
        vendorName,
        adminName: user.name || 'Admin',
        adminId: user.id,
        message,
        messageType,
      });
    }
  }, []);

  // Notify vendor of approval status change
  const notifyVendorApproval = useCallback((vendorId: string, vendorName: string, status: 'approved' | 'rejected' | 'pending', remarks: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('admin:vendor-approval-changed', {
        vendorId,
        vendorName,
        status,
        remarks,
      });
    }
  }, []);

  // Notify vendor of suspension change
  const notifyVendorSuspension = useCallback((vendorId: string, vendorName: string, suspended: boolean, reason: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('admin:vendor-suspension-changed', {
        vendorId,
        vendorName,
        suspended,
        reason,
      });
    }
  }, []);

  // Notify vendor of verification change
  const notifyVendorVerification = useCallback((vendorId: string, vendorName: string, verificationStatus: 'verified' | 'pending' | 'rejected', remarks: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('admin:vendor-verification-changed', {
        vendorId,
        vendorName,
        verificationStatus,
        remarks,
      });
    }
  }, []);

  // Request online vendors
  const requestOnlineVendors = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('admin:request-online-vendors');
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  return {
    requestVendors,
    sendMessageToVendor,
    notifyVendorApproval,
    notifyVendorSuspension,
    notifyVendorVerification,
    requestOnlineVendors,
    disconnect,
    isConnected: socketRef.current?.connected || false,
  };
}
