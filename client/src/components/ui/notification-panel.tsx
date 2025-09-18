import { useState } from 'react';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';

export function NotificationPanel() {
  const { user } = useAuth();
  const { 
    notificationCount, 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    removeNotification 
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  // Only show for wholesaler and shop owner accounts as requested
  if (!user || (user.role !== 'WHOLESALER' && user.role !== 'SHOP_OWNER')) {
    return null;
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return '📦';
      case 'payment':
        return '💰';
      case 'delivery':
        return '🚚';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-blue-50 border-blue-200';
      case 'payment':
        return 'bg-green-50 border-green-200';
      case 'delivery':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {notificationCount > 99 ? '99+' : notificationCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {notificationCount > 0 && (
                <Badge variant="secondary">
                  {notificationCount} new
                </Badge>
              )}
            </SheetTitle>
            
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-sm">We'll notify you when something important happens</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`relative p-4 rounded-lg border transition-all hover:shadow-sm ${
                      notification.read 
                        ? 'bg-gray-50 border-gray-200 opacity-70' 
                        : getNotificationColor(notification.type)
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-medium text-sm ${
                            notification.read ? 'text-gray-600' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h4>
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="h-6 w-6 p-0 hover:bg-blue-100"
                                title="Mark as read"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNotification(notification.id)}
                              className="h-6 w-6 p-0 hover:bg-red-100"
                              title="Remove notification"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className={`text-sm mt-1 ${
                          notification.read ? 'text-gray-500' : 'text-gray-700'
                        }`}>
                          {notification.description}
                        </p>
                        
                        <p className="text-xs text-gray-400 mt-2">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    
                    {!notification.read && (
                      <div className="absolute top-2 left-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}