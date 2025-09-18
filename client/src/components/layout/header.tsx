import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { ProfileSidebar } from "@/components/ui/profile-sidebar";
import { NotificationPanel } from "@/components/ui/notification-panel";
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
          <NotificationPanel />
          
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
            <button
              onClick={onNavigationMenuClick}
              data-testid="button-navigation-menu"
              className="group relative w-10 h-10 flex flex-col justify-center items-center bg-black hover:bg-gray-800 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
            >
              <div className="w-6 h-0.5 bg-white rounded-full transition-all duration-300 ease-in-out transform group-hover:translate-y-0 group-active:rotate-45 group-active:translate-y-1.5"></div>
              <div className="w-6 h-0.5 bg-white rounded-full mt-1.5 transition-all duration-300 ease-in-out transform group-hover:scale-110 group-active:opacity-0"></div>
              <div className="w-6 h-0.5 bg-white rounded-full mt-1.5 transition-all duration-300 ease-in-out transform group-hover:translate-y-0 group-active:-rotate-45 group-active:-translate-y-1.5"></div>
              
              {/* Pulse effect on hover */}
              <div className="absolute inset-0 bg-black rounded-lg opacity-0 group-hover:opacity-20 group-hover:animate-pulse transition-opacity duration-300"></div>
              
              {/* Ripple effect on click */}
              <div className="absolute inset-0 bg-white rounded-lg opacity-0 group-active:opacity-10 group-active:animate-ping transition-opacity duration-150"></div>
            </button>
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
