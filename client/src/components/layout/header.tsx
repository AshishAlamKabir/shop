import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { ProfileSidebar } from "@/components/ui/profile-sidebar";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload";
import logoUrl from "../../assets/logo.png";

interface HeaderProps {
  onMenuClick?: () => void;
  onNavigationMenuClick?: () => void;
}

export default function Header({ onMenuClick, onNavigationMenuClick }: HeaderProps = {}) {
  const [showProfileSidebar, setShowProfileSidebar] = useState(false);
  const { user } = useAuth();

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
          <img src={logoUrl} alt="ShopLink Logo" className="w-10 h-10 object-contain" />
          <h1 className="text-xl font-bold text-foreground">Shop Now</h1>
          <Badge variant="secondary" data-testid="badge-role">
            {getRoleDisplay(user?.role || '')}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
            <i className="fas fa-bell"></i>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center hidden">
              3
            </span>
          </Button>
          
          {/* Profile Icon */}
          <Button 
            variant="ghost" 
            onClick={() => setShowProfileSidebar(true)}
            className="flex items-center space-x-2"
            data-testid="button-profile"
          >
            <ProfilePhotoUpload
              currentPhoto={(user as any)?.profilePhoto}
              userName={user?.fullName || "User"}
              size="sm"
              showUploadButton={false}
            />
            <span className="font-medium text-foreground hidden sm:block">{user?.fullName}</span>
            <i className="fas fa-user text-sm text-muted-foreground"></i>
          </Button>
          
          {/* Navigation Menu Button */}
          {onNavigationMenuClick && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onNavigationMenuClick}
              data-testid="button-navigation-menu"
              className="bg-[#fa0000]"
            >
              <i className="fas fa-bars"></i>
            </Button>
          )}
        </div>
      </div>
      {/* Profile Sidebar */}
      <ProfileSidebar 
        isOpen={showProfileSidebar} 
        onClose={() => setShowProfileSidebar(false)} 
      />
    </header>
  );
}
