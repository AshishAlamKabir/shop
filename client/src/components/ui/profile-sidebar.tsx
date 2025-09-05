import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import EditProfileModal from "@/components/modals/edit-profile-modal";
import ChangePasswordModal from "@/components/modals/change-password-modal";
import SettingsModal from "@/components/modals/settings-modal";

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileSidebar({ isOpen, onClose }: ProfileSidebarProps) {
  const { user, logout } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const getRoleDisplay = (role: string) => {
    return role.replace('_', ' ');
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'fas fa-user-shield';
      case 'RETAILER': return 'fas fa-store';
      case 'SHOP_OWNER': return 'fas fa-shopping-cart';
      case 'DELIVERY_BOY': return 'fas fa-motorcycle';
      default: return 'fas fa-user';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'RETAILER': return 'bg-blue-100 text-blue-800';
      case 'SHOP_OWNER': return 'bg-green-100 text-green-800';
      case 'DELIVERY_BOY': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="left" 
        className="w-80 p-0"
        data-testid="profile-sidebar"
      >
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="text-left">Profile</SheetTitle>
        </SheetHeader>
        
        <div className="p-6 space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold text-primary-foreground">
                    {getUserInitials(user?.fullName || '')}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {user?.fullName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                  <Badge className={`mt-2 ${getRoleColor(user?.role || '')}`}>
                    <i className={`${getRoleIcon(user?.role || '')} mr-1`}></i>
                    {getRoleDisplay(user?.role || '')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <p className="text-sm text-muted-foreground mt-1">{user?.fullName}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">Role</label>
              <p className="text-sm text-muted-foreground mt-1">{getRoleDisplay(user?.role || '')}</p>
            </div>
            
            {(user as any)?.phone && (
              <div>
                <label className="text-sm font-medium text-foreground">Phone</label>
                <p className="text-sm text-muted-foreground mt-1">{(user as any).phone}</p>
              </div>
            )}
          </div>

          {/* Profile Actions */}
          <div className="space-y-2 pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setShowEditProfile(true)}
              data-testid="button-edit-profile"
            >
              <i className="fas fa-edit mr-2"></i>
              Edit Profile
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setShowChangePassword(true)}
              data-testid="button-change-password"
            >
              <i className="fas fa-key mr-2"></i>
              Change Password
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setShowSettings(true)}
              data-testid="button-settings"
            >
              <i className="fas fa-cog mr-2"></i>
              Settings
            </Button>
          </div>

          {/* Sign Out */}
          <div className="pt-4 border-t">
            <Button 
              variant="destructive" 
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full justify-start"
              data-testid="button-logout-profile"
            >
              <i className="fas fa-sign-out-alt mr-2"></i>
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
      
      {/* Modals */}
      <EditProfileModal 
        isOpen={showEditProfile} 
        onClose={() => setShowEditProfile(false)} 
      />
      
      <ChangePasswordModal 
        isOpen={showChangePassword} 
        onClose={() => setShowChangePassword(false)} 
      />
      
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </Sheet>
  );
}