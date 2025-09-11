import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { useCartStore } from "@/store/cart";
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
  TrendingUp,
  Clock 
} from "lucide-react";

interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
  badge?: number;
}

interface BottomNavigationProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function BottomNavigation({ activeSection, onSectionChange }: BottomNavigationProps) {
  const { user } = useAuth();
  const { notificationCount } = useNotifications();
  const { getItemCount } = useCartStore();

  const handleItemClick = (item: BottomNavItem) => {
    if (onSectionChange) {
      onSectionChange(item.section);
    }
  };

  const isActiveItem = (section: string) => {
    return activeSection === section;
  };

  const getNavigationItems = (): BottomNavItem[] => {
    if (!user) return [];

    switch (user.role) {
      case 'RETAILER':
        return [
          {
            id: 'orders',
            label: 'Orders',
            icon: ShoppingBag,
            section: 'orders'
          },
          {
            id: 'khatabook',
            label: 'Khatabook',
            icon: Book,
            section: 'khatabook'
          },
          {
            id: 'delivery-boys',
            label: 'Delivery Boy',
            icon: Bike,
            section: 'delivery-boys'
          },
          {
            id: 'listings',
            label: 'Inventory',
            icon: Package,
            section: 'listings'
          },
          {
            id: 'store',
            label: 'My Store',
            icon: Store,
            section: 'store'
          }
        ];

      case 'SHOP_OWNER':
        return [
          {
            id: 'explore',
            label: 'Explore',
            icon: Search,
            section: 'explore'
          },
          {
            id: 'cart',
            label: 'Cart',
            icon: ShoppingCart,
            section: 'cart',
            badge: getItemCount()
          },
          {
            id: 'orders',
            label: 'My Orders',
            icon: Receipt,
            section: 'orders'
          },
          {
            id: 'retailers',
            label: 'Retailers',
            icon: Users,
            section: 'retailers'
          },
          {
            id: 'khatabook',
            label: 'Khatabook',
            icon: Book,
            section: 'khatabook'
          }
        ];

      case 'DELIVERY_BOY':
        return [
          {
            id: 'pending',
            label: 'Pending',
            icon: Clock,
            section: 'pending'
          },
          {
            id: 'orders',
            label: 'My Deliveries',
            icon: Truck,
            section: 'orders'
          }
        ];

      case 'ADMIN':
        return [
          {
            id: 'overview',
            label: 'Overview',
            icon: BarChart3,
            section: 'overview'
          },
          {
            id: 'users',
            label: 'Users',
            icon: Users,
            section: 'users'
          },
          {
            id: 'catalog',
            label: 'Products',
            icon: Box,
            section: 'catalog'
          },
          {
            id: 'orders',
            label: 'Orders',
            icon: Receipt,
            section: 'orders'
          },
          {
            id: 'analytics',
            label: 'Analytics',
            icon: TrendingUp,
            section: 'analytics',
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
          const isActive = isActiveItem(item.section);
          
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