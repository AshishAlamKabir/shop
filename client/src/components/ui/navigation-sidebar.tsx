import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavigationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function NavigationSidebar({ isOpen, onClose, title, children }: NavigationSidebarProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="left" 
        className="w-80 p-0"
        data-testid="navigation-sidebar"
      >
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="text-left">{title}</SheetTitle>
        </SheetHeader>
        <div className="p-6">
          <nav className="space-y-2">
            {children}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface NavigationItemProps {
  onClick: () => void;
  active: boolean;
  icon: string;
  label: string;
  badge?: number;
  testId?: string;
}

export function NavigationItem({ onClick, active, icon, label, badge, testId }: NavigationItemProps) {
  return (
    <Button
      onClick={onClick}
      variant={active ? "default" : "ghost"}
      className="w-full justify-start"
      data-testid={testId}
    >
      <i className={`${icon} mr-3`}></i>
      {label}
      {badge && badge > 0 && (
        <Badge className="ml-auto">
          {badge}
        </Badge>
      )}
    </Button>
  );
}