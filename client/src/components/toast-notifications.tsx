import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ToastNotifications() {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [paymentChangeRequest, setPaymentChangeRequest] = useState<any>(null);

  // Mutations for handling payment change requests
  const respondToPaymentChangeMutation = useMutation({
    mutationFn: async ({ requestId, response }: { requestId: string; response: 'APPROVED' | 'REJECTED' }) => {
      return apiRequest('POST', `/api/payment-change-requests/${requestId}/respond`, { response });
    },
    onSuccess: (data, variables) => {
      const action = variables.response === 'APPROVED' ? 'approved' : 'rejected';
      toast({ 
        title: `Payment change ${action}`, 
        description: `The payment change request has been ${action}`,
        variant: variables.response === 'APPROVED' ? 'default' : 'destructive'
      });
      setPaymentChangeRequest(null);
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to respond to payment change request",
        variant: "destructive"
      });
    }
  });

  const handlePaymentChangeResponse = (approved: boolean) => {
    if (!paymentChangeRequest) return;
    
    respondToPaymentChangeMutation.mutate({
      requestId: paymentChangeRequest.requestId,
      response: approved ? 'APPROVED' : 'REJECTED'
    });
  };

  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const handleOrderEvent = (data: any) => {
      const { event, payload, orderId, type } = data;
      
      // Handle delivery request notifications
      if (type === 'newDeliveryRequest' && user.role === 'DELIVERY_BOY') {
        toast({
          title: "🚚 New Delivery Request!",
          description: `${payload.description}\nPickup: ${payload.pickupAddress}\nDelivery: ${payload.deliveryAddress}\nReward: ₹${payload.estimatedPayment}`,
          duration: 15000,
        });
        return;
      }
      
      // Handle payment change requests for shop owners
      if (type === 'PAYMENT_CHANGE_REQUEST' && user.role === 'SHOP_OWNER') {
        setPaymentChangeRequest({
          orderId: data.orderId,
          originalAmount: data.originalAmount,
          requestedAmount: data.requestedAmount,
          reason: data.reason,
          requestId: data.requestId
        });
        
        const title = "💰 Payment Change Request";
        const description = `Delivery boy requests changing payment from ₹${data.originalAmount} to ₹${data.requestedAmount}`;
        
        toast({
          title,
          description,
          duration: 10000,
        });
        
        // Add to persistent notification list
        addNotification({
          title,
          description,
          type: 'payment'
        });
        return;
      }
      
      // Handle payment change responses for delivery boys
      if (type === 'PAYMENT_CHANGE_RESPONSE' && user.role === 'DELIVERY_BOY') {
        const statusMessage = data.response === 'APPROVED' 
          ? `✅ Payment confirmed! Amount: ₹${data.finalAmount} - Delivery completed! 🎉`
          : `❌ Payment change rejected. Amount remains: ₹${data.finalAmount} - You can send another request`;
          
        toast({
          title: data.response === 'APPROVED' ? "🚚 Delivery Finished!" : "Payment Change Rejected",
          description: statusMessage,
          variant: data.response === 'APPROVED' ? 'default' : 'destructive',
          duration: data.response === 'APPROVED' ? 10000 : 8000,
        });
        return;
      }
      
      // Handle delivery completion notifications for wholesalers
      if (type === 'DELIVERY_COMPLETED' && user.role === 'WHOLESALER') {
        toast({
          title: "🚚 Delivery Completed!",
          description: `Delivery finished for order #${data.orderId.slice(-8)} - Final amount: ₹${data.finalAmount}`,
          duration: 8000,
        });
        return;
      }
      
      // Handle payment received notifications for wholesalers
      if (type === 'PAYMENT_RECEIVED_NOTIFICATION' && user.role === 'WHOLESALER') {
        const title = "💰 Payment Received!";
        const description = `${data.deliveryBoyName} collected ₹${data.amount} from ${data.customerName} for order ${data.orderNumber}`;
        
        toast({
          title,
          description,
          duration: 10000,
        });
        
        // Add to persistent notification list
        addNotification({
          title,
          description,
          type: 'payment'
        });
        return;
      }
      
      switch (event) {
        case 'orderPlaced':
          if (user.role === 'WHOLESALER') {
            const title = "New Order Received!";
            const description = `Order #${orderId.slice(-8)} - ₹${payload.totalAmount}`;
            
            toast({
              title,
              description,
              duration: 5000,
            });
            
            // Add to persistent notification list
            addNotification({
              title,
              description,
              type: 'order'
            });
          }
          break;
          
        case 'orderAccepted':
          if (user.role === 'SHOP_OWNER') {
            const title = "Order Accepted";
            const description = `Your order #${orderId.slice(-8)} has been accepted`;
            
            toast({
              title,
              description,
              duration: 5000,
            });
            
            // Add to persistent notification list
            addNotification({
              title,
              description,
              type: 'order'
            });
          }
          break;
          
        case 'orderRejected':
          if (user.role === 'SHOP_OWNER') {
            const title = "Order Rejected";
            const description = `Your order #${orderId.slice(-8)} was rejected${payload.reason ? `: ${payload.reason}` : ''}`;
            
            toast({
              title,
              description,
              variant: "destructive",
              duration: 5000,
            });
            
            // Add to persistent notification list
            addNotification({
              title,
              description,
              type: 'order'
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
            const title = "Order Status Updated";
            const description = `Order #${orderId.slice(-8)}: ${message}`;
            
            toast({
              title,
              description,
              duration: 5000,
            });
            
            // Add to persistent notification list
            addNotification({
              title,
              description,
              type: 'order'
            });
          }
          break;
          
        case 'orderCancelled':
          if (user.role === 'WHOLESALER') {
            const title = "Order Cancelled";
            const description = `Order #${orderId.slice(-8)} was cancelled by customer`;
            
            toast({
              title,
              description,
              variant: "destructive",
              duration: 5000,
            });
            
            // Add to persistent notification list
            addNotification({
              title,
              description,
              type: 'order'
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

  return (
    <>
      {/* Payment Change Request Modal */}
      <Dialog open={!!paymentChangeRequest} onOpenChange={() => setPaymentChangeRequest(null)}>
        <DialogContent className="sm:max-w-md" data-testid="payment-change-request-modal">
          <DialogHeader>
            <DialogTitle className="text-center">💰 Payment Change Request</DialogTitle>
          </DialogHeader>
          
          {paymentChangeRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Order #{paymentChangeRequest.orderId.slice(-8)}</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Original Amount:</span>
                    <span className="font-semibold">₹{paymentChangeRequest.originalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Requested Amount:</span>
                    <span className="font-semibold text-primary">₹{paymentChangeRequest.requestedAmount}</span>
                  </div>
                  <div className="border-t pt-2">
                    <span className="text-sm font-medium">Reason:</span>
                    <p className="text-sm text-muted-foreground mt-1">{paymentChangeRequest.reason}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => handlePaymentChangeResponse(false)}
                  disabled={respondToPaymentChangeMutation.isPending}
                  data-testid="reject-payment-change"
                >
                  ❌ Reject
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => handlePaymentChangeResponse(true)}
                  disabled={respondToPaymentChangeMutation.isPending}
                  data-testid="accept-payment-change"
                >
                  ✅ Confirm & Finish Delivery
                </Button>
              </div>
              
              <div className="text-xs text-center text-muted-foreground">
                <strong>Note:</strong> Confirming this amount will complete the delivery. Rejecting allows the delivery boy to send another request.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
