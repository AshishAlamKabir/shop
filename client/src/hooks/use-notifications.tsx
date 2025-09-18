import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  type: 'order' | 'payment' | 'delivery' | 'general';
}

interface NotificationContextType {
  notificationCount: number;
  setNotificationCount: (count: number) => void;
  incrementNotificationCount: () => void;
  clearNotifications: () => void;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  // Calculate unread notification count
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    setNotificationCount(unreadCount);
  }, [notifications]);

  const incrementNotificationCount = () => {
    setNotificationCount(prev => prev + 1);
  };

  const clearNotifications = () => {
    setNotificationCount(0);
    setNotifications([]);
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    // Only add notifications for WHOLESALER and SHOP_OWNER as requested
    if (!user || (user.role !== 'WHOLESALER' && user.role !== 'SHOP_OWNER')) {
      return;
    }

    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep only last 50 notifications
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const value = {
    notificationCount,
    setNotificationCount,
    incrementNotificationCount,
    clearNotifications,
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}