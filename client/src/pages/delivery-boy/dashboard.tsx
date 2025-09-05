import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Header from "@/components/layout/header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function DeliveryBoyDashboard() {
  const [activeSection, setActiveSection] = useState('orders');
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; order: any }>({ isOpen: false, order: null });
  const [paymentChangeModal, setPaymentChangeModal] = useState<{ isOpen: boolean; order: any }>({ isOpen: false, order: null });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: orders = [] } = useQuery({
    queryKey: ['/api/delivery/orders'],
    queryFn: async () => {
      const response = await fetch('/api/delivery/orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    }
  });

  const requestPaymentChangeMutation = useMutation({
    mutationFn: async ({ orderId, newAmount, reason }: { orderId: string; newAmount: string; reason: string }) => {
      return apiRequest(`/api/delivery/orders/${orderId}/request-payment-change`, {
        method: 'POST',
        body: JSON.stringify({ newAmount, reason })
      });
    },
    onSuccess: () => {
      toast({ title: "Payment change request sent", description: "Waiting for shop owner approval" });
      setPaymentChangeModal({ isOpen: false, order: null });
      setNewAmount('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['/api/delivery/orders'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Request failed", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ orderId, amountReceived }: { orderId: string; amountReceived: string }) => {
      return apiRequest(`/api/delivery/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        body: JSON.stringify({ amountReceived, paymentMethod: 'CASH' })
      });
    },
    onSuccess: () => {
      toast({ title: "Payment confirmed", description: "Order completed successfully" });
      setPaymentModal({ isOpen: false, order: null });
      setPaymentAmount('');
      queryClient.invalidateQueries({ queryKey: ['/api/delivery/orders'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Payment confirmation failed", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleRequestPaymentChange = () => {
    if (!paymentChangeModal.order || !newAmount || !reason) return;
    
    requestPaymentChangeMutation.mutate({
      orderId: paymentChangeModal.order.id,
      newAmount,
      reason
    });
  };

  const handleConfirmPayment = () => {
    if (!paymentModal.order || !paymentAmount) return;
    
    confirmPaymentMutation.mutate({
      orderId: paymentModal.order.id,
      amountReceived: paymentAmount
    });
  };

  const openPaymentModal = (order: any) => {
    setPaymentModal({ isOpen: true, order });
    setPaymentAmount(order.totalAmount);
  };

  const openPaymentChangeModal = (order: any) => {
    setPaymentChangeModal({ isOpen: true, order });
    setNewAmount(order.totalAmount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY': return 'bg-blue-100 text-blue-800';
      case 'OUT_FOR_DELIVERY': return 'bg-orange-100 text-orange-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Delivery Dashboard</h1>
          <p className="text-muted-foreground">Manage your delivery assignments and payments</p>
          {user && (
            <div className="mt-4 p-4 bg-card border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <i className="fas fa-id-card text-primary"></i>
                  <span className="font-medium text-foreground">Delivery Boy ID:</span>
                  <code className="px-2 py-1 bg-muted rounded text-sm font-mono">{user.id}</code>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fas fa-user text-primary"></i>
                  <span className="font-medium text-foreground">Name:</span>
                  <span className="text-muted-foreground">{user.fullName}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <i className="fas fa-info-circle mr-1"></i>
                Share your Delivery Boy ID with retailers so they can assign orders to you
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-4 mb-8">
          <Button
            variant={activeSection === 'orders' ? 'default' : 'outline'}
            onClick={() => setActiveSection('orders')}
            className="flex items-center gap-2"
          >
            <i className="fas fa-list"></i>
            My Deliveries ({orders.length})
          </Button>
        </div>

        {activeSection === 'orders' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-truck text-primary"></i>
                  Assigned Deliveries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-truck text-4xl text-muted-foreground mb-4"></i>
                    <h3 className="text-lg font-medium text-foreground mb-2">No deliveries assigned</h3>
                    <p className="text-muted-foreground">Check back later for new delivery assignments</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order: any) => (
                      <div key={order.id} className="border rounded-lg p-4 bg-card">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-foreground">Order #{order.id.slice(-8)}</h4>
                            <p className="text-sm text-muted-foreground">
                              {order.store.name} • {order.store.city}
                            </p>
                          </div>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">Customer</p>
                            <p className="text-sm text-muted-foreground">{order.owner.fullName}</p>
                            <p className="text-sm text-muted-foreground">{order.owner.phone}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Delivery Address</p>
                            <p className="text-sm text-muted-foreground">
                              {order.store.address}, {order.store.city} - {order.store.pincode}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">Order Amount</p>
                            <p className="text-lg font-semibold text-primary">₹{order.totalAmount}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-foreground">Delivery Type</p>
                            <p className="text-sm text-muted-foreground">{order.deliveryType}</p>
                          </div>
                        </div>

                        {order.note && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-foreground">Special Instructions</p>
                            <p className="text-sm text-muted-foreground">{order.note}</p>
                          </div>
                        )}

                        {order.status === 'OUT_FOR_DELIVERY' && (
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => openPaymentChangeModal(order)}
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <i className="fas fa-edit"></i>
                              Request Payment Change
                            </Button>
                            <Button 
                              onClick={() => openPaymentModal(order)}
                              size="sm"
                              className="flex items-center gap-2"
                            >
                              <i className="fas fa-check"></i>
                              Confirm Payment
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment Change Request Modal */}
        <Dialog open={paymentChangeModal.isOpen} onOpenChange={(open) => !open && setPaymentChangeModal({ isOpen: false, order: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Payment Change</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Original Amount</Label>
                <Input 
                  value={`₹${paymentChangeModal.order?.totalAmount || ''}`}
                  disabled
                />
              </div>
              <div>
                <Label>New Amount *</Label>
                <Input 
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="Enter new amount"
                />
              </div>
              <div>
                <Label>Reason for Change *</Label>
                <Textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why the payment amount needs to be changed"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleRequestPaymentChange}
                  disabled={!newAmount || !reason || requestPaymentChangeMutation.isPending}
                  className="flex-1"
                >
                  {requestPaymentChangeMutation.isPending ? 'Sending...' : 'Send Request'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setPaymentChangeModal({ isOpen: false, order: null })}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Confirmation Modal */}
        <Dialog open={paymentModal.isOpen} onOpenChange={(open) => !open && setPaymentModal({ isOpen: false, order: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Order Amount</Label>
                <Input 
                  value={`₹${paymentModal.order?.totalAmount || ''}`}
                  disabled
                />
              </div>
              <div>
                <Label>Amount Received *</Label>
                <Input 
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount received from customer"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <i className="fas fa-info-circle mr-2"></i>
                This will complete the order and update the khatabook records.
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleConfirmPayment}
                  disabled={!paymentAmount || confirmPaymentMutation.isPending}
                  className="flex-1"
                >
                  {confirmPaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setPaymentModal({ isOpen: false, order: null })}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}