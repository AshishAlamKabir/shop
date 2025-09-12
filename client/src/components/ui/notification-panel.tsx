import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Bell, X, Clock, Package, DollarSign, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'delivery' | 'payment' | 'order' | 'system';
  timestamp: Date;
  read: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Mock notification data based on user role
  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const mockNotifications: Notification[] = [];

    switch (user.role) {
      case 'DELIVERY_BOY':
        mockNotifications.push(
          {
            id: '1',
            title: 'New Delivery Request',
            description: 'Order #12345 needs pickup from Green Valley Store',
            type: 'delivery',
            timestamp: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago
            read: false,
            icon: Package
          },
          {
            id: '2',
            title: 'Delivery Completed',
            description: 'Successfully delivered order #12344 - ₹150 earned',
            type: 'payment',
            timestamp: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
            read: false,
            icon: CheckCircle
          },
          {
            id: '3',
            title: 'Weekly Earnings Update',
            description: 'You earned ₹2,850 this week across 19 deliveries',
            type: 'system',
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
            read: true,
            icon: DollarSign
          }
        );
        break;

      case 'RETAILER':
        mockNotifications.push(
          {
            id: '4',
            title: 'New Order Received',
            description: 'Order #12346 from Sharma General Store - ₹850',
            type: 'order',
            timestamp: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
            read: false,
            icon: Package
          },
          {
            id: '5',
            title: 'Payment Received',
            description: 'Payment of ₹1,200 received from Kumar Store',
            type: 'payment',
            timestamp: new Date(now.getTime() - 45 * 60 * 1000), // 45 minutes ago
            read: false,
            icon: DollarSign
          },
          {
            id: '6',
            title: 'Low Inventory Alert',
            description: 'Rice (5kg) stock is running low - only 5 left',
            type: 'system',
            timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
            read: true,
            icon: Package
          }
        );
        break;

      case 'SHOP_OWNER':
        mockNotifications.push(
          {
            id: '7',
            title: 'Order Delivered',
            description: 'Your order #12347 has been delivered successfully',
            type: 'delivery',
            timestamp: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
            read: false,
            icon: CheckCircle
          },
          {
            id: '8',
            title: 'New Retailer Available',
            description: 'Gupta Wholesale is now available in your area',
            type: 'system',
            timestamp: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
            read: false,
            icon: Package
          },
          {
            id: '9',
            title: 'Khatabook Updated',
            description: 'Your credit limit has been increased to ₹5,000',
            type: 'payment',
            timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
            read: true,
            icon: DollarSign
          }
        );
        break;

      case 'ADMIN':
        mockNotifications.push(
          {
            id: '10',
            title: 'System Alert',
            description: 'High server load detected - monitoring required',
            type: 'system',
            timestamp: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
            read: false,
            icon: Bell
          },
          {
            id: '11',
            title: 'New User Registration',
            description: '12 new users registered in the last hour',
            type: 'system',
            timestamp: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
            read: false,
            icon: Package
          },
          {
            id: '12',
            title: 'Daily Report',
            description: 'Platform processed 456 orders worth ₹45,600 today',
            type: 'system',
            timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
            read: true,
            icon: DollarSign
          }
        );
        break;
    }

    // Sort notifications by timestamp (ascending order - oldest first)
    mockNotifications.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    setNotifications(mockNotifications);
  }, [user]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'delivery': return 'bg-blue-500';
      case 'payment': return 'bg-green-500';
      case 'order': return 'bg-orange-500';
      case 'system': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const IconComponent = notification.icon || Bell;
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all duration-200",
                    notification.read 
                      ? "bg-muted/50 border-muted" 
                      : "bg-card border-primary/20 shadow-sm hover:shadow-md"
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={cn(
                      "p-2 rounded-full flex items-center justify-center",
                      getNotificationTypeColor(notification.type)
                    )}>
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={cn(
                          "text-sm font-medium truncate",
                          notification.read ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-1 ml-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className={cn(
                        "text-xs leading-relaxed",
                        notification.read ? "text-muted-foreground" : "text-muted-foreground"
                      )}>
                        {notification.description}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}