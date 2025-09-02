import { useEffect } from "react";
import { useSocket } from "@/hooks/use-socket";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function ToastNotifications() {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const handleOrderEvent = (data: any) => {
      const { event, payload, orderId } = data;
      
      switch (event) {
        case 'orderPlaced':
          if (user.role === 'RETAILER') {
            toast({
              title: "New Order Received!",
              description: `Order #${orderId.slice(-8)} - ₹${payload.totalAmount}`,
              duration: 5000,
            });
          }
          break;
          
        case 'orderAccepted':
          if (user.role === 'SHOP_OWNER') {
            toast({
              title: "Order Accepted",
              description: `Your order #${orderId.slice(-8)} has been accepted`,
              duration: 5000,
            });
          }
          break;
          
        case 'orderRejected':
          if (user.role === 'SHOP_OWNER') {
            toast({
              title: "Order Rejected",
              description: `Your order #${orderId.slice(-8)} was rejected${payload.reason ? `: ${payload.reason}` : ''}`,
              variant: "destructive",
              duration: 5000,
            });
          }
          break;
          
        case 'orderStatusChanged':
          const statusMessages = {
            'READY': 'Your order is ready for pickup/delivery',
            'OUT_FOR_DELIVERY': 'Your order is out for delivery',
            'COMPLETED': 'Your order has been completed'
          };
          
          const message = statusMessages[payload.status as keyof typeof statusMessages];
          if (message && user.role === 'SHOP_OWNER') {
            toast({
              title: "Order Status Updated",
              description: `Order #${orderId.slice(-8)}: ${message}`,
              duration: 5000,
            });
          }
          break;
          
        case 'orderCancelled':
          if (user.role === 'RETAILER') {
            toast({
              title: "Order Cancelled",
              description: `Order #${orderId.slice(-8)} was cancelled by customer`,
              variant: "destructive",
              duration: 5000,
            });
          }
          break;
      }
    };

    // Listen for all order events
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        handleOrderEvent(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    return () => {
      // WebSocket cleanup is handled in useSocket hook
    };
  }, [socket, isConnected, user, toast]);

  return null; // This component only handles side effects
}
