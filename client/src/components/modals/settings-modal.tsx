import React from "react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    orderUpdates: true,
    marketingEmails: false,
    darkMode: false,
    soundEffects: true,
  });

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // In a real app, you'd save this to the backend
    toast({ 
      title: "Setting updated", 
      description: "Your preferences have been saved" 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="settings-modal">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Notifications Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications" className="text-sm">Email Notifications</Label>
                <Switch
                  id="email-notifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                  data-testid="switch-email-notifications"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="push-notifications" className="text-sm">Push Notifications</Label>
                <Switch
                  id="push-notifications"
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
                  data-testid="switch-push-notifications"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="order-updates" className="text-sm">Order Updates</Label>
                <Switch
                  id="order-updates"
                  checked={settings.orderUpdates}
                  onCheckedChange={(checked) => handleSettingChange('orderUpdates', checked)}
                  data-testid="switch-order-updates"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="marketing-emails" className="text-sm">Marketing Emails</Label>
                <Switch
                  id="marketing-emails"
                  checked={settings.marketingEmails}
                  onCheckedChange={(checked) => handleSettingChange('marketingEmails', checked)}
                  data-testid="switch-marketing-emails"
                />
              </div>
            </CardContent>
          </Card>

          {/* App Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">App Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className="text-sm">Dark Mode</Label>
                <Switch
                  id="dark-mode"
                  checked={settings.darkMode}
                  onCheckedChange={(checked) => handleSettingChange('darkMode', checked)}
                  data-testid="switch-dark-mode"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="sound-effects" className="text-sm">Sound Effects</Label>
                <Switch
                  id="sound-effects"
                  checked={settings.soundEffects}
                  onCheckedChange={(checked) => handleSettingChange('soundEffects', checked)}
                  data-testid="switch-sound-effects"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={onClose}
              className="flex-1"
              data-testid="button-close-settings"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}