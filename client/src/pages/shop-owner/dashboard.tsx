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
import StoreCatalogModal from "@/components/modals/store-catalog-modal";
import { useCartStore } from "@/store/cart";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ShopOwnerDashboard() {
  const [activeSection, setActiveSection] = useState('explore');
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [searchFilters, setSearchFilters] = useState({ search: '', city: '', pincode: '' });
  const [deliveryType, setDeliveryType] = useState('PICKUP');
  const [orderNote, setOrderNote] = useState('');
  
  const { cart, removeFromCart, updateQuantity, clearCart, getTotalAmount, getItemCount } = useCartStore();
  const { toast } = useToast();

  const { data: stores = [] } = useQuery({
    queryKey: ['/api/stores', searchFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchFilters.search) params.append('search', searchFilters.search);
      if (searchFilters.city) params.append('city', searchFilters.city);
      if (searchFilters.pincode) params.append('pincode', searchFilters.pincode);
      
      const response = await fetch(`/api/stores?${params}`);
      if (!response.ok) throw new Error('Failed to fetch stores');
      return response.json();
    }
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['/api/orders/mine'],
    queryFn: async () => {
      const response = await fetch('/api/orders/mine', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    }
  });

  const { data: popularProducts = [] } = useQuery({
    queryKey: ['/api/popular-products'],
    queryFn: async () => {
      const response = await fetch('/api/popular-products?limit=8');
      if (!response.ok) throw new Error('Failed to fetch popular products');
      return response.json();
    }
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest('POST', '/api/orders', orderData);
    },
    onSuccess: () => {
      clearCart();
      setActiveSection('orders');
      queryClient.invalidateQueries({ queryKey: ['/api/orders/mine'] });
      toast({ title: "Order placed successfully!", description: "You will receive updates shortly." });
    },
    onError: () => {
      toast({ title: "Failed to place order", variant: "destructive" });
    }
  });

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }

    const orderData = {
      storeId: cart[0].storeId, // Assuming all items are from same store
      items: cart.map(item => ({ listingId: item.listingId, qty: item.qty })),
      deliveryType,
      note: orderNote
    };

    placeOrderMutation.mutate(orderData);
  };

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border p-6">
          <nav className="space-y-2">
            <Button
              onClick={() => setActiveSection('explore')}
              variant={activeSection === 'explore' ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="button-nav-explore"
            >
              <i className="fas fa-search mr-3"></i>
              Explore Stores
            </Button>
            <Button
              onClick={() => setActiveSection('cart')}
              variant={activeSection === 'cart' ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="button-nav-cart"
            >
              <i className="fas fa-shopping-cart mr-3"></i>
              Cart
              {getItemCount() > 0 && (
                <Badge className="ml-auto" data-testid="badge-cart-count">
                  {getItemCount()}
                </Badge>
              )}
            </Button>
            <Button
              onClick={() => setActiveSection('orders')}
              variant={activeSection === 'orders' ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="button-nav-orders"
            >
              <i className="fas fa-receipt mr-3"></i>
              My Orders
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Explore Stores Section */}
          {activeSection === 'explore' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Explore Stores</h2>
                <p className="text-muted-foreground">Discover retailers and browse their products</p>
              </div>

              {/* Search and Filters */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search stores..."
                        value={searchFilters.search}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, search: e.target.value }))}
                        data-testid="input-search-stores"
                      />
                    </div>
                    <Input
                      placeholder="City"
                      value={searchFilters.city}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, city: e.target.value }))}
                      data-testid="input-filter-city"
                    />
                    <Input
                      placeholder="Pincode"
                      value={searchFilters.pincode}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, pincode: e.target.value }))}
                      data-testid="input-filter-pincode"
                    />
                    <Button data-testid="button-search-stores">
                      <i className="fas fa-search"></i>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Store Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stores.map((store: any) => (
                  <Card 
                    key={store.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedStore(store)}
                    data-testid={`card-store-${store.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                            <i className="fas fa-store text-primary-foreground"></i>
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{store.name}</h3>
                            <p className="text-sm text-muted-foreground">Electronics & Gadgets</p>
                          </div>
                        </div>
                        <span className={`w-3 h-3 rounded-full ${store.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <i className="fas fa-map-marker-alt mr-2"></i>
                          {store.city}, {store.pincode}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <i className="fas fa-star text-yellow-400 mr-1"></i>
                            {store.rating} rating
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            {store.listings?.length || 0} products
                          </div>
                        </div>
                      </div>
                      
                      <Button className="w-full" data-testid={`button-browse-${store.id}`}>
                        Browse Catalog
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Popular Products Section */}
              <div className="mt-12">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">Popular Products</h3>
                  <p className="text-muted-foreground">Trending items based on customer orders</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {popularProducts.map((item: any) => (
                    <Card 
                      key={item.product.id} 
                      className="hover:shadow-md transition-shadow"
                      data-testid={`card-popular-${item.product.id}`}
                    >
                      <CardContent className="p-4">
                        <img 
                          src={item.product.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=160'} 
                          alt={item.product.name}
                          className="w-full h-32 object-cover rounded-md mb-3"
                        />
                        <h4 className="font-medium text-foreground mb-1 text-sm">{item.product.name}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {item.product.brand} • {item.product.size}
                        </p>
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs text-muted-foreground">
                            {item.totalOrdered > 0 ? (
                              <>
                                <i className="fas fa-fire text-orange-500 mr-1"></i>
                                {item.totalOrdered} sold
                              </>
                            ) : (
                              <>
                                <i className="fas fa-star text-yellow-500 mr-1"></i>
                                Featured
                              </>
                            )}
                          </div>
                          <Badge 
                            variant={item.product.isWholesale ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {item.product.isWholesale ? 'Wholesale' : 'Retail'}
                          </Badge>
                        </div>
                        {item.avgPrice > 0 && (
                          <div className="text-sm font-semibold text-foreground">
                            Avg: ₹{parseFloat(item.avgPrice).toFixed(0)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {popularProducts.length === 0 && (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <i className="fas fa-chart-line text-4xl mb-4 opacity-50"></i>
                      <p>No popular products data available yet</p>
                      <p className="text-sm">Products will appear here based on order history</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Cart Section */}
          {activeSection === 'cart' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Shopping Cart</h2>
                <p className="text-muted-foreground">Review your items and place orders</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cart Items */}
                <div className="lg:col-span-2">
                  {cart.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        <i className="fas fa-shopping-cart text-4xl mb-4 opacity-50"></i>
                        <p>Your cart is empty</p>
                        <p className="text-sm">Browse stores to add products</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <div className="p-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">Cart Items</h3>
                        <p className="text-sm text-muted-foreground">{cart.length} items</p>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        {cart.map((item) => (
                          <div key={item.listingId} className="flex items-center space-x-4" data-testid={`cart-item-${item.listingId}`}>
                            <img 
                              src={item.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=60&h=60'} 
                              alt={item.name}
                              className="w-15 h-15 rounded-md object-cover"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">{item.brand} • {item.size}</p>
                              <p className="text-sm font-medium text-foreground">₹{item.price} each</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateQuantity(item.listingId, Math.max(1, item.qty - 1))}
                                data-testid={`button-decrease-${item.listingId}`}
                              >
                                <i className="fas fa-minus text-xs"></i>
                              </Button>
                              <span className="w-8 text-center font-medium" data-testid={`qty-${item.listingId}`}>
                                {item.qty}
                              </span>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateQuantity(item.listingId, item.qty + 1)}
                                data-testid={`button-increase-${item.listingId}`}
                              >
                                <i className="fas fa-plus text-xs"></i>
                              </Button>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-foreground">₹{item.price * item.qty}</div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => removeFromCart(item.listingId)}
                                className="text-destructive hover:text-destructive/80"
                                data-testid={`button-remove-${item.listingId}`}
                              >
                                <i className="fas fa-trash"></i>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>

                {/* Order Summary */}
                {cart.length > 0 && (
                  <Card className="h-fit">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium text-foreground" data-testid="text-subtotal">
                            ₹{getTotalAmount()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Delivery Fee</span>
                          <span className="font-medium text-foreground">₹50</span>
                        </div>
                        <div className="pt-3 border-t border-border flex justify-between">
                          <span className="font-semibold text-foreground">Total</span>
                          <span className="font-bold text-foreground" data-testid="text-total">
                            ₹{getTotalAmount() + 50}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <Label className="text-sm font-medium text-foreground">Delivery Type</Label>
                        <Select value={deliveryType} onValueChange={setDeliveryType}>
                          <SelectTrigger className="mt-2" data-testid="select-delivery-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DELIVERY">Delivery</SelectItem>
                            <SelectItem value="PICKUP">Pickup</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="mb-6">
                        <Label className="text-sm font-medium text-foreground">Special Instructions</Label>
                        <Textarea 
                          rows={3} 
                          placeholder="Add any special notes..."
                          value={orderNote}
                          onChange={(e) => setOrderNote(e.target.value)}
                          className="mt-2 resize-none"
                          data-testid="textarea-order-note"
                        />
                      </div>
                      
                      <Button 
                        onClick={handlePlaceOrder}
                        className="w-full"
                        disabled={placeOrderMutation.isPending}
                        data-testid="button-place-order"
                      >
                        <i className="fas fa-shopping-cart mr-2"></i>
                        {placeOrderMutation.isPending ? 'Placing Order...' : 'Place Order'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* My Orders Section */}
          {activeSection === 'orders' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">My Orders</h2>
                <p className="text-muted-foreground">Track your order status and history</p>
              </div>

              <div className="space-y-4">
                {orders.map((order: any) => (
                  <Card key={order.id} data-testid={`card-order-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-foreground">#{order.id.slice(-8)}</h4>
                          <p className="text-sm text-muted-foreground">{order.store.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Placed on {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(order.status)} data-testid={`status-${order.id}`}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="mb-4">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex items-center space-x-3 mb-2">
                            <img 
                              src={item.listing.product.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=40&h=40'} 
                              alt={item.listing.product.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-foreground">
                                {item.listing.product.name} x{item.qty}
                              </div>
                              <div className="text-sm text-muted-foreground">₹{item.priceAt} each</div>
                            </div>
                            <div className="text-right font-medium text-foreground">
                              ₹{parseFloat(item.priceAt) * item.qty}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Order Timeline */}
                      {order.timeline && order.timeline.length > 0 && (
                        <div className="border-t border-border pt-4">
                          <h5 className="font-medium text-foreground mb-3">Order Timeline</h5>
                          <div className="space-y-2">
                            {order.timeline.slice(0, 3).map((event: any, index: number) => (
                              <div key={event.id} className="flex items-center space-x-3">
                                <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted'}`}></div>
                                <div className="text-sm">
                                  <span className="font-medium text-foreground">{event.message}</span>
                                  <span className="text-muted-foreground ml-2">
                                    {new Date(event.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                        <div className="font-semibold text-foreground">Total: ₹{order.totalAmount}</div>
                        <div className="flex space-x-2">
                          {order.status === 'PENDING' && (
                            <Button variant="outline" size="sm" data-testid={`button-cancel-${order.id}`}>
                              Cancel Order
                            </Button>
                          )}
                          <Button variant="secondary" size="sm" data-testid={`button-track-${order.id}`}>
                            Track Order
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {orders.length === 0 && (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <i className="fas fa-receipt text-4xl mb-4 opacity-50"></i>
                      <p>No orders yet</p>
                      <p className="text-sm">Start exploring stores to place your first order</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <StoreCatalogModal 
        store={selectedStore}
        isOpen={!!selectedStore}
        onClose={() => setSelectedStore(null)}
      />
    </div>
  );
}
