import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ToastNotifications() {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const { toast } = useToast();
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
        
        toast({
          title: "💰 Payment Change Request",
          description: `Delivery boy requests changing payment from ₹${data.originalAmount} to ₹${data.requestedAmount}`,
          duration: 10000,
        });
        return;
      }
      
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
                  ✅ Accept
                </Button>
              </div>
              
              <div className="text-xs text-center text-muted-foreground">
                This request was sent by the delivery boy for order transparency
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
