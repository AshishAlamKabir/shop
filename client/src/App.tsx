import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { NotificationProvider } from "@/hooks/use-notifications";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin/dashboard";
import RetailerDashboard from "@/pages/retailer/dashboard";
import ShopOwnerDashboard from "@/pages/shop-owner/dashboard";
import DeliveryBoyDashboard from "@/pages/delivery-boy/dashboard";
import NotFound from "@/pages/not-found";
import ToastNotifications from "@/components/toast-notifications";

function AppContent() {
  const { user, isLoading } = useAuth();
  useSocket(); // Initialize socket connection

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen pb-20">
      <Switch>
        <Route path="/" component={() => {
          if (user.role === 'ADMIN') return <AdminDashboard />;
          if (user.role === 'RETAILER') return <RetailerDashboard />;
          if (user.role === 'SHOP_OWNER') return <ShopOwnerDashboard />;
          if (user.role === 'DELIVERY_BOY') return <DeliveryBoyDashboard />;
          return <NotFound />;
        }} />
        <Route path="/admin/*" component={() => user.role === 'ADMIN' ? <AdminDashboard /> : <NotFound />} />
        <Route path="/retailer/*" component={() => user.role === 'RETAILER' ? <RetailerDashboard /> : <NotFound />} />
        <Route path="/shop/*" component={() => user.role === 'SHOP_OWNER' ? <ShopOwnerDashboard /> : <NotFound />} />
        <Route path="/delivery/*" component={() => user.role === 'DELIVERY_BOY' ? <DeliveryBoyDashboard /> : <NotFound />} />
        <Route component={NotFound} />
      </Switch>
      <BottomNavigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NotificationProvider>
          <AppContent />
          <Toaster />
          <ToastNotifications />
        </NotificationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
