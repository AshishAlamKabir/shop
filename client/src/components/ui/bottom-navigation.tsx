import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { useCartStore } from "@/store/cart";
import { useLocation } from "wouter";
import { 
  ShoppingBag, 
  Book, 
  Bike, 
  Package, 
  Store, 
  Search, 
  ShoppingCart, 
  Receipt, 
  Users, 
  Truck, 
  Bell, 
  User, 
  BarChart3, 
  Box, 
  TrendingUp 
} from "lucide-react";

interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

interface BottomNavigationProps {
  onNavigate?: (sectionId: string) => void;
}

export function BottomNavigation({ onNavigate }: BottomNavigationProps) {
  const { user } = useAuth();
  const { notificationCount } = useNotifications();
  const { getItemCount } = useCartStore();
  const [location, setLocation] = useLocation();

  const handleItemClick = (item: BottomNavItem) => {
    setLocation(item.path);
    if (onNavigate) {
      onNavigate(item.id);
    }
  };

  const isActiveItem = (path: string) => {
    return location === path || location.startsWith(path);
  };

  const getNavigationItems = (): BottomNavItem[] => {
    if (!user) return [];

    switch (user.role) {
      case 'RETAILER':
        return [
          {
            id: 'order',
            label: 'Orders',
            icon: ShoppingBag,
            path: '/retailer/orders'
          },
          {
            id: 'khatabook',
            label: 'Khatabook',
            icon: Book,
            path: '/retailer/khatabook'
          },
          {
            id: 'delivery-boy',
            label: 'Delivery Boy',
            icon: Bike,
            path: '/retailer/delivery-boy'
          },
          {
            id: 'inventory',
            label: 'Inventory',
            icon: Package,
            path: '/retailer/inventory'
          },
          {
            id: 'my-store',
            label: 'My Store',
            icon: Store,
            path: '/retailer/my-store'
          }
        ];

      case 'SHOP_OWNER':
        return [
          {
            id: 'explore-stores',
            label: 'Explore',
            icon: Search,
            path: '/shop/explore'
          },
          {
            id: 'cart',
            label: 'Cart',
            icon: ShoppingCart,
            path: '/shop/cart',
            badge: getItemCount()
          },
          {
            id: 'my-orders',
            label: 'My Orders',
            icon: Receipt,
            path: '/shop/orders'
          },
          {
            id: 'retailer-accounts',
            label: 'Retailers',
            icon: Users,
            path: '/shop/retailers'
          },
          {
            id: 'khatabook',
            label: 'Khatabook',
            icon: Book,
            path: '/shop/khatabook'
          }
        ];

      case 'DELIVERY_BOY':
        return [
          {
            id: 'my-delivery',
            label: 'My Delivery',
            icon: Truck,
            path: '/delivery/my-delivery'
          },
          {
            id: 'notifications',
            label: 'Notifications',
            icon: Bell,
            path: '/delivery/notifications',
            badge: notificationCount
          },
          {
            id: 'profile',
            label: 'Profile',
            icon: User,
            path: '/delivery/profile'
          }
        ];

      case 'ADMIN':
        return [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: BarChart3,
            path: '/admin/dashboard'
          },
          {
            id: 'users',
            label: 'Users',
            icon: Users,
            path: '/admin/users'
          },
          {
            id: 'products',
            label: 'Products',
            icon: Box,
            path: '/admin/products'
          },
          {
            id: 'reports',
            label: 'Reports',
            icon: TrendingUp,
            path: '/admin/reports'
          },
          {
            id: 'notifications',
            label: 'Notifications',
            icon: Bell,
            path: '/admin/notifications',
            badge: notificationCount
          }
        ];

      default:
        return [];
    }
  };

  const navigationItems = getNavigationItems();

  if (navigationItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around py-2 px-4">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = isActiveItem(item.path);
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className="flex flex-col items-center justify-center h-16 w-16 p-2 relative"
              onClick={() => handleItemClick(item)}
              data-testid={`bottom-nav-${item.id}`}
              aria-label={item.label}
            >
              <IconComponent className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium truncate w-full text-center">
                {item.label}
              </span>
              {item.badge && item.badge > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs"
                  variant="destructive"
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}