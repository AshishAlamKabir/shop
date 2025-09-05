import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps = {}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();

  const getRoleDisplay = (role: string) => {
    return role.replace('_', ' ');
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-store text-primary-foreground"></i>
          </div>
          <h1 className="text-xl font-bold text-foreground">ShopLink</h1>
          <Badge variant="secondary" data-testid="badge-role">
            {getRoleDisplay(user?.role || '')}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button - Show for non-Admin roles */}
          {onMenuClick && user?.role !== 'ADMIN' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onMenuClick}
              className="md:hidden"
              data-testid="button-mobile-menu"
            >
              <i className="fas fa-bars"></i>
            </Button>
          )}
          
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
            <i className="fas fa-bell"></i>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center hidden">
              3
            </span>
          </Button>
          
          {/* Menu Button for Retailers, Shop Owners, and Delivery Boys */}
          {onMenuClick && user?.role !== 'ADMIN' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onMenuClick}
              className="hidden md:block"
              data-testid="button-menu"
            >
              <i className="fas fa-bars"></i>
            </Button>
          )}
          
          {/* User Menu */}
          <div className="relative">
            <Button 
              variant="ghost" 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2"
              data-testid="button-user-menu"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {getUserInitials(user?.fullName || '')}
                </span>
              </div>
              <span className="font-medium text-foreground">{user?.fullName}</span>
              <i className="fas fa-chevron-down text-xs text-muted-foreground"></i>
            </Button>
            
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-md shadow-lg z-50">
                <div className="py-1">
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full justify-start text-sm"
                    data-testid="button-logout"
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Sign Out
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
