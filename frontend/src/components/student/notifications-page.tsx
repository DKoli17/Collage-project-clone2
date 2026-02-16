import { useState } from 'react';
import { StudentSidebar } from './dashboard/sidebar';
import { DashboardHeader } from './dashboard-header';
import { NotificationsPanel } from './notifications-panel';

interface Notification {
  id: string;
  type: 'new_discount' | 'expiring' | 'verification' | 'announcement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export function NotificationsPage() {
  const [activeSection, setActiveSection] = useState('notifications');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'new_discount',
      title: 'New Discount Available',
      message: 'Tech Store is offering 30% off on laptops and accessories. Check it out now!',
      timestamp: '2 hours ago',
      read: false,
    },
    {
      id: '2',
      type: 'expiring',
      title: 'Offer Expiring Soon',
      message: 'Your Fashion Hub discount (25% off) expires in 3 days. Hurry up!',
      timestamp: '5 hours ago',
      read: false,
    },
    {
      id: '3',
      type: 'verification',
      title: 'Verification Successful',
      message: 'Your student account has been verified successfully.',
      timestamp: '1 day ago',
      read: true,
    },
    {
      id: '4',
      type: 'announcement',
      title: 'Platform Announcement',
      message: 'We have added new categories to our platform. Explore Food & Dining discounts now!',
      timestamp: '2 days ago',
      read: true,
    },
    {
      id: '5',
      type: 'new_discount',
      title: 'Restaurant Offer',
      message: 'Food Court is offering buy one get one on selected items.',
      timestamp: '3 days ago',
      read: true,
    },
  ]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const handleDismiss = (id: string) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  const handleAction = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (notification?.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <StudentSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <DashboardHeader 
          studentName="John Doe"
          studentEmail="john@example.com"
          verificationStatus="verified"
        />
        <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
            <p className="text-gray-600">
              {unreadCount > 0 
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` 
                : 'All caught up! No new notifications'}
            </p>
          </div>

          <NotificationsPanel
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onDismiss={handleDismiss}
            onAction={handleAction}
          />
        </div>
      </div>
    </div>
  );
}
