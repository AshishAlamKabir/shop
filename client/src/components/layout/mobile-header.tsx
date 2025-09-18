import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { ProfileSidebar } from "@/components/ui/profile-sidebar";
import { NotificationPanel } from "@/components/ui/notification-panel";
import { Menu, Search, ShoppingCart } from "lucide-react";
import logoUrl from "../../assets/logo.png";

interface MobileHeaderProps {
  onMenuClick?: () => void;
  showSearch?: boolean;
  showCart?: boolean;
  title?: string;
}

export default function MobileHeader({ 
  onMenuClick, 
  showSearch = true, 
  showCart = true,
  title = "Shop Now"
}: MobileHeaderProps) {
  const [showProfileSidebar, setShowProfileSidebar] = useState(false);
  const { user } = useAuth();

  return (
    <>
      {/* Mobile Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3" style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}>
          {/* Left Section */}
          <div className="flex items-center space-x-3">
            {/* Hamburger Menu */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onMenuClick}
              className="p-2 hover:bg-muted rounded-lg"
              data-testid="mobile-menu-button"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Logo and Title */}
            <div className="flex items-center space-x-2">
              <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
              <h1 className="text-lg font-bold text-foreground truncate max-w-[120px]">
                {title}
              </h1>
            </div>
          </div>
          
          {/* Right Section */}
          <div className="flex items-center space-x-2">
            {/* Search Button */}
            {showSearch && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-2 hover:bg-muted rounded-lg"
                data-testid="mobile-search-button"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
            
            {/* Notifications */}
            <NotificationPanel />
            
            {/* Cart (for shop owners) */}
            {showCart && user?.role === 'SHOP_OWNER' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-2 hover:bg-muted rounded-lg relative"
                data-testid="mobile-cart-button"
              >
                <ShoppingCart className="h-5 w-5" />
                {/* Cart badge will be added later */}
              </Button>
            )}
          </div>
        </div>
        
        {/* Role Badge */}
        <div className="px-4 pb-2">
          <Badge variant="secondary" className="text-xs">
            {user?.role?.replace('_', ' ') || 'User'}
          </Badge>
        </div>
      </header>

      {/* Profile Sidebar */}
      <ProfileSidebar 
        isOpen={showProfileSidebar} 
        onClose={() => setShowProfileSidebar(false)} 
      />
    </>
  );
}