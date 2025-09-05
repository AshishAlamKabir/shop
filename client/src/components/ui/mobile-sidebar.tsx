import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function MobileSidebar({ isOpen, onClose, title, children }: MobileSidebarProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-80 p-0"
        data-testid="mobile-sidebar"
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

interface SidebarNavItemProps {
  onClick: () => void;
  active: boolean;
  icon: string;
  label: string;
  badge?: number;
  testId?: string;
}

export function SidebarNavItem({ onClick, active, icon, label, badge, testId }: SidebarNavItemProps) {
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