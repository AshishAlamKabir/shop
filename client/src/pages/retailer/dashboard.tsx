import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function RetailerDashboard() {
  const [activeSection, setActiveSection] = useState('store');
  const { toast } = useToast();

  const { data: store } = useQuery({
    queryKey: ['/api/retailer/store/me'],
    queryFn: async () => {
      const response = await fetch('/api/retailer/store/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch store');
      return response.json();
    }
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['/api/retailer/listings'],
    queryFn: async () => {
      const response = await fetch('/api/retailer/listings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch listings');
      return response.json();
    }
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['/api/retailer/orders'],
    queryFn: async () => {
      const response = await fetch('/api/retailer/orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    }
  });

  const { data: ledgerSummary } = useQuery({
    queryKey: ['/api/khatabook/summary'],
    queryFn: async () => {
      const response = await fetch('/api/khatabook/summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch ledger summary');
      return response.json();
    }
  });

  const { data: ledgerEntries } = useQuery({
    queryKey: ['/api/khatabook'],
    queryFn: async () => {
      const response = await fetch('/api/khatabook', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch ledger entries');
      return response.json();
    }
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async ({ orderId, deliveryAt }: { orderId: string; deliveryAt?: string }) => {
      await apiRequest('POST', `/api/orders/${orderId}/accept`, { deliveryAt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/orders'] });
      toast({ title: "Order accepted successfully" });
    }
  });

  const rejectOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      await apiRequest('POST', `/api/orders/${orderId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/orders'] });
      toast({ title: "Order rejected" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      await apiRequest('POST', `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/orders'] });
      toast({ title: "Order status updated" });
    }
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ orderId, amountReceived }: { orderId: string; amountReceived?: string }) => {
      await apiRequest('POST', `/api/orders/${orderId}/payment-received`, { amountReceived });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/orders'] });
      toast({ 
        title: "✅ Payment Confirmed", 
        description: "Shop owner has been notified of payment receipt" 
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'READY': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingOrders = orders.filter((order: any) => order.status === 'PENDING');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border p-6">
          <nav className="space-y-2">
            <Button
              onClick={() => setActiveSection('store')}
              variant={activeSection === 'store' ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="button-nav-store"
            >
              <i className="fas fa-store mr-3"></i>
              My Store
            </Button>
            <Button
              onClick={() => setActiveSection('listings')}
              variant={activeSection === 'listings' ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="button-nav-listings"
            >
              <i className="fas fa-box mr-3"></i>
              Inventory
            </Button>
            <Button
              onClick={() => setActiveSection('orders')}
              variant={activeSection === 'orders' ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="button-nav-orders"
            >
              <i className="fas fa-receipt mr-3"></i>
              Orders
              {pendingOrders.length > 0 && (
                <Badge className="ml-auto" data-testid="badge-pending-orders">
                  {pendingOrders.length}
                </Badge>
              )}
            </Button>
            <Button
              onClick={() => setActiveSection('khatabook')}
              variant={activeSection === 'khatabook' ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="button-nav-khatabook"
            >
              <i className="fas fa-book mr-3"></i>
              Khatabook
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Store Profile Section */}
          {activeSection === 'store' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Store Profile</h2>
                <p className="text-muted-foreground">Manage your store information and settings</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Store Info Card */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground">Store Information</h3>
                        <Button variant="outline" data-testid="button-edit-store">Edit</Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-foreground">Store Name</Label>
                          <Input 
                            value={store?.name || ''} 
                            readOnly 
                            className="mt-2"
                            data-testid="input-store-name"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-foreground">City</Label>
                          <Input 
                            value={store?.city || ''} 
                            readOnly 
                            className="mt-2"
                            data-testid="input-store-city"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-foreground">Pincode</Label>
                          <Input 
                            value={store?.pincode || ''} 
                            readOnly 
                            className="mt-2"
                            data-testid="input-store-pincode"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-foreground">Status</Label>
                          <Select value={store?.isOpen ? 'open' : 'closed'}>
                            <SelectTrigger className="mt-2" data-testid="select-store-status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-foreground">Address</Label>
                          <Textarea 
                            value={store?.address || ''} 
                            readOnly 
                            rows={3} 
                            className="mt-2"
                            data-testid="textarea-store-address"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Store Stats */}
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="text-2xl font-bold text-primary" data-testid="text-store-rating">
                        {store?.rating || '0.0'}
                      </div>
                      <div className="text-sm text-muted-foreground">Store Rating</div>
                      <div className="flex justify-center mt-2">
                        <div className="flex text-yellow-400">
                          {[1,2,3,4,5].map(star => (
                            <i key={star} className="fas fa-star text-xs"></i>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="text-2xl font-bold text-foreground" data-testid="text-active-products">
                        {listings.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Active Products</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="text-2xl font-bold text-foreground" data-testid="text-pending-orders">
                        {pendingOrders.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Pending Orders</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Section */}
          {activeSection === 'listings' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Inventory Management</h2>
                  <p className="text-muted-foreground">Add products from catalog and manage pricing</p>
                </div>
                <Button data-testid="button-add-listing">
                  <i className="fas fa-plus mr-2"></i>
                  Add from Catalog
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing: any) => (
                  <Card key={listing.id} className="hover:shadow-md transition-shadow" data-testid={`card-listing-${listing.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <img 
                          src={listing.product.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&h=80'} 
                          alt={listing.product.name}
                          className="w-16 h-16 rounded-md object-cover"
                        />
                        <div className="flex items-center space-x-2">
                          <span className={`w-3 h-3 rounded-full ${listing.available ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-xs text-muted-foreground">
                            {listing.available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-medium text-foreground mb-1">{listing.product.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {listing.product.brand} • {listing.product.size}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Retail Price:</span>
                          <span className="font-medium text-foreground">₹{listing.priceRetail}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Stock:</span>
                          <span className={`font-medium ${listing.stockQty > 0 ? 'text-foreground' : 'text-destructive'}`}>
                            {listing.stockQty || 0} units
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-listing-${listing.id}`}>
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive border-destructive hover:bg-destructive/10"
                          data-testid={`button-toggle-listing-${listing.id}`}
                        >
                          <i className={`fas ${listing.available ? 'fa-pause' : 'fa-play'}`}></i>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Orders Section */}
          {activeSection === 'orders' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Order Management</h2>
                <p className="text-muted-foreground">Review and process incoming orders</p>
              </div>

              <div className="space-y-4">
                {orders.map((order: any) => (
                  <Card key={order.id} data-testid={`card-order-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-foreground">#{order.id.slice(-8)}</h4>
                          <p className="text-sm text-muted-foreground">from {order.owner.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(order.status)} data-testid={`status-${order.id}`}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <img 
                                src={item.listing.product.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=40&h=40'} 
                                alt={item.listing.product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                              <div>
                                <div className="font-medium text-foreground">{item.listing.product.name}</div>
                                <div className="text-sm text-muted-foreground">{item.listing.product.size}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-foreground">Qty: {item.qty}</div>
                              <div className="text-sm text-muted-foreground">₹{parseFloat(item.priceAt) * item.qty}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div>
                          <div className="font-semibold text-foreground">Total: ₹{order.totalAmount}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.deliveryType === 'DELIVERY' ? 'Delivery requested' : 'Pickup requested'}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {order.status === 'PENDING' && (
                            <>
                              <Button 
                                variant="outline" 
                                onClick={() => rejectOrderMutation.mutate({ orderId: order.id, reason: 'Unable to fulfill' })}
                                className="text-destructive border-destructive hover:bg-destructive/10"
                                data-testid={`button-reject-${order.id}`}
                              >
                                Reject
                              </Button>
                              <Button 
                                onClick={() => acceptOrderMutation.mutate({ orderId: order.id })}
                                data-testid={`button-accept-${order.id}`}
                              >
                                Accept
                              </Button>
                            </>
                          )}
                          {order.status === 'ACCEPTED' && (
                            <Button 
                              onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'READY' })}
                              data-testid={`button-ready-${order.id}`}
                            >
                              Mark Ready
                            </Button>
                          )}
                          {order.status === 'READY' && (
                            <Button 
                              onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'OUT_FOR_DELIVERY' })}
                              data-testid={`button-out-for-delivery-${order.id}`}
                            >
                              Out for Delivery
                            </Button>
                          )}
                          {order.status === 'OUT_FOR_DELIVERY' && (
                            <>
                              <Button 
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'COMPLETED' })}
                                data-testid={`button-complete-${order.id}`}
                              >
                                Mark Delivered
                              </Button>
                              {!order.paymentReceived && order.deliveryType === 'DELIVERY' && (
                                <Button 
                                  variant="outline"
                                  onClick={() => confirmPaymentMutation.mutate({ orderId: order.id })}
                                  data-testid={`button-confirm-payment-${order.id}`}
                                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                >
                                  <i className="fas fa-money-bill mr-2"></i>
                                  Confirm Payment
                                </Button>
                              )}
                            </>
                          )}
                          {order.status === 'COMPLETED' && !order.paymentReceived && order.deliveryType === 'DELIVERY' && (
                            <Button 
                              variant="outline"
                              onClick={() => confirmPaymentMutation.mutate({ orderId: order.id })}
                              data-testid={`button-confirm-payment-${order.id}`}
                              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                            >
                              <i className="fas fa-money-bill mr-2"></i>
                              Confirm COD Payment
                            </Button>
                          )}
                          {order.paymentReceived && (
                            <div className="flex items-center text-green-600 font-medium">
                              <i className="fas fa-check-circle mr-2"></i>
                              Payment Received ₹{order.amountReceived || order.totalAmount}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {orders.length === 0 && (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      No orders yet. Orders will appear here when customers place them.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Khatabook Section */}
          {activeSection === 'khatabook' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Khatabook</h2>
                <p className="text-muted-foreground">Track your payment collections and balance</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Balance</p>
                        <p className="text-2xl font-bold text-foreground">
                          ₹{ledgerSummary?.currentBalance?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-full">
                        <i className="fas fa-wallet text-blue-600"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Credits</p>
                        <p className="text-2xl font-bold text-green-600">
                          ₹{ledgerSummary?.totalCredits?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className="bg-green-100 p-3 rounded-full">
                        <i className="fas fa-arrow-up text-green-600"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Debits</p>
                        <p className="text-2xl font-bold text-red-600">
                          ₹{ledgerSummary?.totalDebits?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className="bg-red-100 p-3 rounded-full">
                        <i className="fas fa-arrow-down text-red-600"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Transaction History</h3>
                  <div className="space-y-3">
                    {ledgerEntries?.entries?.map((entry: any) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${entry.entryType === 'CREDIT' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                          <div>
                            <div className="font-medium text-foreground">{entry.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleDateString()} • {entry.transactionType.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${entry.entryType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                            {entry.entryType === 'CREDIT' ? '+' : '-'}₹{parseFloat(entry.amount).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Bal: ₹{parseFloat(entry.balance).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!ledgerEntries?.entries || ledgerEntries.entries.length === 0) && (
                      <div className="text-center text-muted-foreground py-8">
                        No transactions yet. Payment confirmations will appear here as ledger entries.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
