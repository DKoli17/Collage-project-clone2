import { useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface AdminAction {
  approvalStatus: 'pending' | 'approved' | 'rejected';
  verificationStatus: 'pending' | 'verified' | 'rejected';
  suspended: boolean;
  suspensionReason?: string;
  approvalRemarks?: string;
  approvedAt?: Date;
  createdAt: Date;
  timestamp: Date;
}

interface AdminMessage {
  adminId: string;
  adminName: string;
  message: string;
  messageType: 'info' | 'warning' | 'success' | 'error' | 'pending';
  timestamp: Date;
}

interface ApprovalUpdate {
  status: 'approved' | 'rejected' | 'pending';
  remarks: string;
  message: string;
  timestamp: Date;
}

interface SuspensionUpdate {
  suspended: boolean;
  reason: string;
  message: string;
  timestamp: Date;
}

interface VerificationUpdate {
  verificationStatus: 'verified' | 'pending' | 'rejected';
  remarks: string;
  message: string;
  timestamp: Date;
}

export function useAdminNotifications(
  onAdminActionsLoaded?: (actions: AdminAction) => void,
  onAdminMessageReceived?: (message: AdminMessage) => void,
  onApprovalStatusUpdated?: (update: ApprovalUpdate) => void,
  onSuspensionStatusUpdated?: (update: SuspensionUpdate) => void,
  onVerificationStatusUpdated?: (update: VerificationUpdate) => void,
  onConnectionStatusChange?: (connected: boolean) => void
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
          userRole: 'vendor',
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('✅ Vendor connected to admin notifications');
        reconnectAttemptsRef.current = 0;
        socket.emit('vendor:join', vendorId);
        onConnectionStatusChange?.(true);
      });

      socket.on('connection:status', (data) => {
        console.log('📡 Connection status:', data);
      });

      // Receive admin actions history
      socket.on('vendor:admin-actions:loaded', (actions) => {
        console.log('📤 Received admin actions', actions);
        onAdminActionsLoaded?.(actions);
      });

      // Receive messages from admins
      socket.on('vendor:admin-message', (message) => {
        console.log(`📨 Received message from admin ${message.adminName}: ${message.message}`);
        onAdminMessageReceived?.(message);
      });

      // Approval status changed by admin
      socket.on('vendor:approval:updated', (update) => {
        console.log(`✅ Approval status updated: ${update.status}`);
        onApprovalStatusUpdated?.(update);
      });

      // Suspension status changed by admin
      socket.on('vendor:suspension:updated', (update) => {
        console.log(`⛔ Suspension status updated: ${update.suspended}`);
        onSuspensionStatusUpdated?.(update);
      });

      // Verification status changed by admin
      socket.on('vendor:verification:updated', (update) => {
        console.log(`📋 Verification status updated: ${update.verificationStatus}`);
        onVerificationStatusUpdated?.(update);
      });

      socket.on('disconnect', () => {
        console.log('❌ Vendor disconnected from admin notifications');
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
      console.error('Failed to connect to admin notifications:', error);
    }
  }, [onAdminActionsLoaded, onAdminMessageReceived, onApprovalStatusUpdated, onSuspensionStatusUpdated, onVerificationStatusUpdated, onConnectionStatusChange]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // Request admin actions history
  const requestAdminActions = useCallback((vendorId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('vendor:request-admin-actions', vendorId);
    }
  }, []);

  // Send message to all admins
  const sendMessageToAdmins = useCallback((message: string, messageType: 'info' | 'warning' | 'success' | 'error' = 'info') => {
    if (socketRef.current?.connected) {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};

      socketRef.current.emit('vendor:send-message-to-admins', {
        vendorId: user.id,
        vendorName: user.name || 'Vendor',
        message,
        messageType,
      });
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    requestAdminActions,
    sendMessageToAdmins,
    disconnect,
    isConnected: socketRef.current?.connected || false,
  };
}
