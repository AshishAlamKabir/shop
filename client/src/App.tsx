import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { NotificationProvider } from "@/hooks/use-notifications";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin/dashboard";
import WholesalerDashboard from "@/pages/wholesaler/dashboard";
import WholesalerSearch from "@/pages/wholesaler/search";
import ShopOwnerDashboard from "@/pages/shop-owner/dashboard";
import ShopOwnerSearch from "@/pages/shop-owner/search";
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
    <div className="min-h-screen mobile-bottom-safe bg-background">
      {/* Mobile-optimized layout container */}
      <div className="w-full max-w-sm mx-auto lg:max-w-none lg:mx-0 bg-background min-h-screen">
        <Switch>
          <Route path="/" component={() => {
            if (user.role === 'ADMIN') return <AdminDashboard />;
            if (user.role === 'WHOLESALER') return <WholesalerDashboard />;
            if (user.role === 'SHOP_OWNER') return <ShopOwnerDashboard />;
            if (user.role === 'DELIVERY_BOY') return <DeliveryBoyDashboard />;
            return <NotFound />;
          }} />
          <Route path="/admin/*" component={() => user.role === 'ADMIN' ? <AdminDashboard /> : <NotFound />} />
          <Route path="/wholesaler/search" component={() => user.role === 'WHOLESALER' ? <WholesalerSearch /> : <NotFound />} />
          <Route path="/wholesaler/*" component={() => user.role === 'WHOLESALER' ? <WholesalerDashboard /> : <NotFound />} />
          <Route path="/shop/search" component={() => user.role === 'SHOP_OWNER' ? <ShopOwnerSearch /> : <NotFound />} />
          <Route path="/shop/*" component={() => user.role === 'SHOP_OWNER' ? <ShopOwnerDashboard /> : <NotFound />} />
          <Route path="/delivery/*" component={() => user.role === 'DELIVERY_BOY' ? <DeliveryBoyDashboard /> : <NotFound />} />
          <Route component={NotFound} />
        </Switch>
      </div>
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
