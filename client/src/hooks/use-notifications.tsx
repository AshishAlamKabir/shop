import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface NotificationContextType {
  notificationCount: number;
  setNotificationCount: (count: number) => void;
  incrementNotificationCount: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notificationCount, setNotificationCount] = useState(0);
  const { user } = useAuth();

  // Mock notification data - in real app this would come from API/socket
  useEffect(() => {
    if (user) {
      // Simulate different notification counts based on role
      switch (user.role) {
        case 'DELIVERY_BOY':
          setNotificationCount(5); // Delivery notifications
          break;
        case 'ADMIN':
          setNotificationCount(12); // Admin notifications
          break;
        case 'RETAILER':
          setNotificationCount(3); // Order notifications
          break;
        case 'SHOP_OWNER':
          setNotificationCount(7); // Order/store notifications
          break;
        default:
          setNotificationCount(0);
      }
    }
  }, [user]);

  const incrementNotificationCount = () => {
    setNotificationCount(prev => prev + 1);
  };

  const clearNotifications = () => {
    setNotificationCount(0);
  };

  const value = {
    notificationCount,
    setNotificationCount,
    incrementNotificationCount,
    clearNotifications
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