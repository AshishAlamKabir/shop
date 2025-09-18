import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Header from "@/components/layout/header";
import MobileHeader from "@/components/layout/mobile-header";
import StoreCatalogModal from "@/components/modals/store-catalog-modal";
import { NavigationSidebar, NavigationItem } from "@/components/ui/navigation-sidebar";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { MobileCard, MobileProductCard } from "@/components/ui/mobile-card";
import ToastNotifications from "@/components/toast-notifications";
import { useCartStore } from "@/store/cart";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import defaultProductUrl from "../../assets/default-product.jpg";

export default function ShopOwnerDashboard() {
  const [activeSection, setActiveSection] = useState('explore');
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [searchFilters, setSearchFilters] = useState({ search: '', city: '', pincode: '', name: '', id: '' });
  const [deliveryType, setDeliveryType] = useState('DELIVERY');
  const [orderNote, setOrderNote] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedOrderForAdjustment, setSelectedOrderForAdjustment] = useState<any>(null);
  const [productQuantities, setProductQuantities] = useState<{[key: string]: number}>({});
  
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getTotalAmount, getItemCount } = useCartStore();
  const { toast } = useToast();


  const { data: stores = [] } = useQuery({
    queryKey: ['/api/stores', searchFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchFilters.search) params.append('search', searchFilters.search);
      if (searchFilters.city) params.append('city', searchFilters.city);
      if (searchFilters.pincode) params.append('pincode', searchFilters.pincode);
      if (searchFilters.name) params.append('name', searchFilters.name);
      if (searchFilters.id) params.append('id', searchFilters.id);
      
      const response = await fetch(`/api/stores?${params}`);
      if (!response.ok) throw new Error('Failed to fetch stores');
      return response.json();
    }
  });

  const { data: popularRetailers = [] } = useQuery({
    queryKey: ['/api/stores/popular'],
    queryFn: async () => {
      const response = await fetch('/api/stores/popular?limit=10');
      if (!response.ok) throw new Error('Failed to fetch popular retailers');
      return response.json();
    }
  });


  const { data: retailerBalancesData } = useQuery({
    queryKey: ['/api/khatabook/retailer-balances'],
    queryFn: async () => {
      const response = await fetch('/api/khatabook/retailer-balances', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch retailer balances');
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

  // Get listings for popular products to enable add to cart
  const { data: allStores = [] } = useQuery({
    queryKey: ['/api/stores-detailed'],
    queryFn: async () => {
      const storeList = await fetch('/api/stores').then(res => res.json());
      const storeDetails = await Promise.all(
        storeList.map(async (store: any) => {
          const response = await fetch(`/api/stores/${store.id}`);
          return response.json();
        })
      );
      return storeDetails;
    },
    enabled: popularProducts.length > 0
  });

  // Extract retailer balances array and totals from API response
  const retailerBalances = retailerBalancesData?.retailerBalances || [];
  const retailerBalancesTotals = retailerBalancesData?.totals || { currentBalance: 0, totalCredits: 0, totalDebits: 0 };

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

  const { data: paymentChangeRequests = [] } = useQuery({
    queryKey: ['/api/shop-owner/payment-change-requests'],
    queryFn: async () => {
      const response = await fetch('/api/shop-owner/payment-change-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch payment change requests');
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

  const adjustAmountMutation = useMutation({
    mutationFn: async ({ orderId, adjustedAmount, adjustmentNote }: { orderId: string; adjustedAmount: string; adjustmentNote: string }) => {
      return await apiRequest('POST', `/api/orders/${orderId}/adjust-amount`, { adjustedAmount, adjustmentNote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/mine'] });
      setAdjustmentDialogOpen(false);
      setAdjustmentAmount('');
      setAdjustmentNote('');
      setSelectedOrderForAdjustment(null);
      toast({ title: "Payment amount adjusted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to adjust payment amount", variant: "destructive" });
    }
  });

  const approvePaymentChangeMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest('POST', `/api/shop-owner/payment-change-requests/${requestId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop-owner/payment-change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/mine'] });
      toast({ title: "Payment change approved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to approve payment change", variant: "destructive" });
    }
  });

  const rejectPaymentChangeMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      return await apiRequest('POST', `/api/shop-owner/payment-change-requests/${requestId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop-owner/payment-change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/mine'] });
      toast({ title: "Payment change rejected" });
    },
    onError: () => {
      toast({ title: "Failed to reject payment change", variant: "destructive" });
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

  const findBestListingForProduct = (productId: string) => {
    for (const store of allStores) {
      const listing = store.listings?.find((l: any) => l.productId === productId && l.available);
      if (listing) {
        return {
          listingId: listing.id,
          storeId: store.id,
          storeName: store.name,
          price: parseFloat(listing.price),
          ...listing
        };
      }
    }
    return null;
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setProductQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, quantity)
    }));
  };

  const handleAddToCart = (item: any) => {
    const listing = findBestListingForProduct(item.product.id);
    if (!listing) {
      toast({ 
        title: "Product not available", 
        description: "This product is not currently available in any store.",
        variant: "destructive"
      });
      return;
    }

    const quantity = productQuantities[item.product.id] || 1;
    
    addToCart({
      listingId: listing.listingId,
      storeId: listing.storeId,
      name: item.product.name,
      brand: item.product.brand,
      size: item.product.size,
      price: listing.price,
      imageUrl: item.product.imageUrl || defaultProductUrl,
      qty: quantity
    });

    toast({ 
      title: "Added to cart!", 
      description: `${quantity}x ${item.product.name} from ${listing.storeName}`,
      action: (
        <Button
          size="sm"
          onClick={() => setActiveSection('cart')}
          className="ml-auto"
        >
          <i className="fas fa-shopping-cart mr-1"></i>
          View Cart
        </Button>
      )
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header */}
      <div className="desktop-only">
        <Header onNavigationMenuClick={() => setIsNavigationOpen(true)} />
      </div>
      
      {/* Mobile Header */}
      <div className="mobile-only">
        <MobileHeader 
          onMenuClick={() => setIsNavigationOpen(true)}
          title="Shop Now"
          showSearch={true}
          showCart={true}
        />
      </div>
      
      <div className="h-[calc(100vh-80px)] mobile-scroll">
        {/* Main Content */}
        <main className="flex-1 mobile-spacing lg:p-6 overflow-auto">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="lg:col-span-2">
                      <Label className="text-sm font-medium">Search</Label>
                      <Input
                        placeholder="Search stores..."
                        value={searchFilters.search}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, search: e.target.value }))}
                        data-testid="input-search-stores"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">City</Label>
                      <Input
                        placeholder="Enter city"
                        value={searchFilters.city}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, city: e.target.value }))}
                        data-testid="input-filter-city"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Pincode</Label>
                      <Input
                        placeholder="Enter pincode"
                        value={searchFilters.pincode}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, pincode: e.target.value }))}
                        data-testid="input-filter-pincode"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Name (optional)</Label>
                      <Input
                        placeholder="Store name"
                        value={searchFilters.name}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, name: e.target.value }))}
                        data-testid="input-filter-name"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">ID (optional)</Label>
                      <Input
                        placeholder="Store ID"
                        value={searchFilters.id}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, id: e.target.value }))}
                        data-testid="input-filter-id"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button data-testid="button-search-stores" className="flex items-center gap-2">
                      <i className="fas fa-search"></i>
                      Search
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Popular Retailers Section */}
              {popularRetailers.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <i className="fas fa-star text-yellow-500"></i>
                    Popular Retailers
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    {popularRetailers.slice(0, 5).map((retailer: any) => (
                      <Card 
                        key={retailer.id} 
                        className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-yellow-400"
                        onClick={() => setSelectedStore(retailer)}
                      >
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                              <i className="fas fa-store text-primary-foreground text-sm"></i>
                            </div>
                            <h4 className="font-medium text-sm text-foreground truncate">{retailer.name}</h4>
                            <p className="text-xs text-blue-600 font-medium">
                              {retailer.retailerName || 'Unknown'}
                            </p>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <i className="fas fa-star text-yellow-500 text-xs"></i>
                              <span className="text-xs text-muted-foreground">
                                {retailer.rating ? parseFloat(retailer.rating).toFixed(1) : '4.5'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{retailer.city}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

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
                            <p className="text-sm text-blue-600 font-medium">Retailer: {store.retailerName || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">Electronics & Gadgets</p>
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
                            <i className="fas fa-star text-yellow-500 mr-1"></i>
                            <span>{store.rating ? parseFloat(store.rating).toFixed(1) : '4.5'}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {store.id.slice(-8)}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          {store.listings?.length || 0} products
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
                          src={item.product.imageUrl || defaultProductUrl} 
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
                        {(() => {
                          const listing = findBestListingForProduct(item.product.id);
                          const quantity = productQuantities[item.product.id] || 1;
                          
                          return (
                            <div className="space-y-3">
                              {listing ? (
                                <div className="text-sm font-semibold text-foreground">
                                  ₹{listing.price.toFixed(2)} <span className="text-xs text-muted-foreground">at {listing.storeName}</span>
                                </div>
                              ) : item.avgPrice > 0 ? (
                                <div className="text-sm font-semibold text-foreground">
                                  Avg: ₹{parseFloat(item.avgPrice).toFixed(0)}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  Price not available
                                </div>
                              )}
                              
                              {listing && (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center border border-border rounded-md">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleQuantityChange(item.product.id, quantity - 1)}
                                      data-testid={`button-decrease-${item.product.id}`}
                                    >
                                      -
                                    </Button>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={quantity}
                                      onChange={(e) => handleQuantityChange(item.product.id, parseInt(e.target.value) || 1)}
                                      className="h-8 w-12 text-center border-0 focus-visible:ring-0"
                                      data-testid={`input-quantity-${item.product.id}`}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleQuantityChange(item.product.id, quantity + 1)}
                                      data-testid={`button-increase-${item.product.id}`}
                                    >
                                      +
                                    </Button>
                                  </div>
                                  <Button
                                    size="sm"
                                    className="flex-1 h-8"
                                    onClick={() => handleAddToCart(item)}
                                    data-testid={`button-add-cart-${item.product.id}`}
                                  >
                                    <i className="fas fa-shopping-cart mr-1"></i>
                                    Add
                                  </Button>
                                </div>
                              )}
                              
                              {!listing && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="w-full h-8"
                                  data-testid={`button-unavailable-${item.product.id}`}
                                >
                                  Not Available
                                </Button>
                              )}
                            </div>
                          );
                        })()}
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
                              src={item.imageUrl || defaultProductUrl} 
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
                              src={item.listing.product.imageUrl || defaultProductUrl} 
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
                        <div>
                          <div className="font-semibold text-foreground">Total: ₹{order.totalAmount}</div>
                          {order.paymentReceived && (
                            <div className="flex items-center text-green-600 text-sm mt-1">
                              <i className="fas fa-check-circle mr-2"></i>
                              Payment Received: ₹{order.amountReceived || order.totalAmount}
                              {order.amountReceived !== order.totalAmount && order.originalAmountReceived && (
                                <span className="text-muted-foreground ml-2">
                                  (Originally ₹{order.originalAmountReceived})
                                </span>
                              )}
                            </div>
                          )}
                          {!order.paymentReceived && ['OUT_FOR_DELIVERY', 'COMPLETED'].includes(order.status) && order.deliveryType === 'DELIVERY' && (
                            <div className="text-orange-600 text-sm mt-1">
                              <i className="fas fa-clock mr-2"></i>
                              Awaiting COD payment confirmation
                            </div>
                          )}
                        </div>
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

              {/* Payment Change Requests Section */}
              {paymentChangeRequests.length > 0 && (
                <div className="mt-8">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                      <i className="fas fa-money-bill-wave text-yellow-500"></i>
                      Pending Payment Change Requests
                    </h3>
                    <p className="text-muted-foreground">Delivery personnel have requested payment changes for these orders</p>
                  </div>

                  <div className="space-y-4">
                    {paymentChangeRequests.filter((req: any) => req.status === 'PENDING').map((request: any) => (
                      <Card key={request.id} className="border-l-4 border-l-yellow-400">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold text-foreground">
                                  Order #{request.orderId.slice(-8)}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Requested by delivery personnel
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm">Original Amount:</span>
                                  <span className="font-semibold">₹{request.originalAmount}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm">Requested Amount:</span>
                                  <span className="font-semibold text-primary">₹{request.requestedAmount}</span>
                                </div>
                                <div className="border-t pt-2">
                                  <span className="text-sm font-medium">Reason:</span>
                                  <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => rejectPaymentChangeMutation.mutate({ requestId: request.id })}
                                disabled={rejectPaymentChangeMutation.isPending}
                                data-testid={`button-reject-${request.id}`}
                              >
                                ❌ Reject
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => approvePaymentChangeMutation.mutate(request.id)}
                                disabled={approvePaymentChangeMutation.isPending}
                                data-testid={`button-approve-${request.id}`}
                              >
                                ✅ Approve
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Retailer Accounts Section */}
          {activeSection === 'retailers' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Retailer Accounts</h2>
                <p className="text-muted-foreground">Manage your relationships with all retailers</p>
              </div>

              {/* Combined Retailer Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {stores.map((retailer: any) => {
                  const balance = retailerBalances.find((b: any) => b.retailerId === retailer.ownerId);
                  return (
                    <Card 
                      key={retailer.id}
                      className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500"
                      data-testid={`card-retailer-${retailer.id}`}
                    >
                      <CardContent className="p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                              <i className="fas fa-store text-primary-foreground"></i>
                            </div>
                            <div>
                              <h3 className="font-bold text-foreground text-lg">{retailer.name}</h3>
                              <p className="text-sm text-blue-600 font-medium">Retailer: {retailer.retailerName || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">Store ID: {retailer.id.slice(-8)}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`w-3 h-3 rounded-full mb-1 ${retailer.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className="text-xs text-muted-foreground">
                              {retailer.isOpen ? 'Open' : 'Closed'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Store Details */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <i className="fas fa-map-marker-alt mr-3 w-4"></i>
                            <span>{retailer.address || `${retailer.city}, ${retailer.pincode}`}</span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <i className="fas fa-phone mr-3 w-4"></i>
                            <span>{retailer.retailerPhone || retailer.phone || 'Not provided'}</span>
                          </div>
                          {retailer.retailerEmail && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <i className="fas fa-envelope mr-3 w-4"></i>
                              <span>{retailer.retailerEmail}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center text-muted-foreground">
                              <i className="fas fa-star text-yellow-500 mr-2"></i>
                              <span>{retailer.rating ? parseFloat(retailer.rating).toFixed(1) : '4.5'} Rating</span>
                            </div>
                            <div className="text-foreground font-medium">
                              {retailer.listings?.length || 0} Products
                            </div>
                          </div>
                        </div>
                        
                        {/* Financial Information */}
                        {balance ? (
                          <div className="bg-muted/50 rounded-lg p-4 mb-4">
                            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                              <i className="fas fa-wallet"></i>
                              Account Balance
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center">
                                <p className={`font-bold text-lg ${balance.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ₹{Math.abs(balance.currentBalance).toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {balance.currentBalance >= 0 ? 'Credit Balance' : 'Outstanding'}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="font-medium text-foreground">
                                  ₹{balance.totalCredits ? parseFloat(balance.totalCredits).toFixed(2) : '0.00'}
                                </p>
                                <p className="text-xs text-muted-foreground">Total Credits</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-muted/50 rounded-lg p-4 mb-4 text-center">
                            <i className="fas fa-chart-line text-muted-foreground mb-2"></i>
                            <p className="text-sm text-muted-foreground">No transactions yet</p>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button 
                            className="flex-1" 
                            onClick={() => setSelectedStore(retailer)}
                            data-testid={`button-browse-catalog-${retailer.id}`}
                          >
                            <i className="fas fa-eye mr-2"></i>
                            Browse Catalog
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSearchFilters({ search: '', city: '', pincode: '', name: retailer.name, id: '' });
                              setActiveSection('explore');
                            }}
                            data-testid={`button-view-store-${retailer.id}`}
                          >
                            <i className="fas fa-external-link-alt"></i>
                          </Button>
                        </div>
                        
                        {/* Quick Stats */}
                        <div className="mt-4 pt-4 border-t border-border">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Owner ID: {retailer.ownerId?.slice(-8)}</span>
                            <span>Since: {new Date(retailer.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Empty State */}
              {stores.length === 0 && (
                <div className="text-center py-12">
                  <i className="fas fa-store-alt text-6xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Retailers Found</h3>
                  <p className="text-muted-foreground mb-6">There are no retailers available at the moment.</p>
                  <Button onClick={() => setActiveSection('explore')}>
                    <i className="fas fa-search mr-2"></i>
                    Explore Stores
                  </Button>
                </div>
              )}
            </div>
          )}


          {/* Khatabook Section */}
          {activeSection === 'khatabook' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Khatabook - Retailer Accounts</h2>
                <p className="text-muted-foreground">Track account balances with each retailer</p>
              </div>

              {/* Overall Summary */}
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
                          ₹{ledgerSummary?.totalCredits ? parseFloat(ledgerSummary.totalCredits).toFixed(2) : '0.00'}
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
                          ₹{ledgerSummary?.totalDebits ? parseFloat(ledgerSummary.totalDebits).toFixed(2) : '0.00'}
                        </p>
                      </div>
                      <div className="bg-red-100 p-3 rounded-full">
                        <i className="fas fa-arrow-down text-red-600"></i>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Individual Retailer Balances */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <i className="fas fa-users text-primary"></i>
                  Individual Retailer Balances
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {retailerBalances.length > 0 ? (
                    retailerBalances.map((retailer: any) => (
                      <Card key={retailer.retailerId} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                <i className="fas fa-store text-primary-foreground text-sm"></i>
                              </div>
                              <div>
                                <h4 className="font-medium text-foreground">{retailer.retailerName}</h4>
                                <p className="text-xs text-muted-foreground">ID: {retailer.retailerId.slice(-8)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${retailer.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹{Math.abs(retailer.currentBalance).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {retailer.currentBalance >= 0 ? 'Credit' : 'Debit'}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Total Credits</p>
                              <p className="font-medium text-green-600">₹{retailer.totalCredits ? parseFloat(retailer.totalCredits).toFixed(2) : '0.00'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Debits</p>
                              <p className="font-medium text-red-600">₹{retailer.totalDebits ? parseFloat(retailer.totalDebits).toFixed(2) : '0.00'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="lg:col-span-2 text-center text-muted-foreground py-8">
                      <i className="fas fa-chart-line text-4xl mb-4"></i>
                      <p>No retailer transactions yet</p>
                      <p className="text-sm">Start placing orders to see retailer balances</p>
                    </div>
                  )}
                </div>
              </div>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Transaction History</h3>
                  {(() => {
                    // Group transactions by retailer
                    const groupedTransactions = (ledgerEntries?.entries || []).reduce((groups: any, entry: any) => {
                      const retailerKey = entry.counterpartyId || 'unknown';
                      if (!groups[retailerKey]) {
                        groups[retailerKey] = [];
                      }
                      groups[retailerKey].push(entry);
                      return groups;
                    }, {});

                    return Object.keys(groupedTransactions).length > 0 ? (
                      <div className="space-y-6">
                        {Object.entries(groupedTransactions).map(([retailerId, transactions]: [string, any]) => {
                          const retailerInfo = retailerBalances.find((r: any) => r.retailerId === retailerId);
                          const retailerName = retailerInfo?.retailerName || `Retailer ${retailerId.slice(-8)}`;
                          
                          return (
                            <div key={retailerId} className="border border-border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                    <i className="fas fa-store text-primary-foreground text-xs"></i>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-foreground">{retailerName}</h4>
                                    <p className="text-xs text-muted-foreground">Retailer ID: {retailerId.slice(-8)}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`font-semibold ${retailerInfo?.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Balance: ₹{retailerInfo ? Math.abs(retailerInfo.currentBalance).toFixed(2) : '0.00'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {retailerInfo?.currentBalance >= 0 ? 'You owe' : 'They owe you'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                {transactions.map((entry: any) => (
                                  <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
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
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No transactions yet. Transactions will appear here when you place orders.
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>


      <StoreCatalogModal 
        store={selectedStore}
        isOpen={!!selectedStore}
        onClose={() => setSelectedStore(null)}
        onNavigateToCart={() => {
          setSelectedStore(null);
          setActiveSection('cart');
        }}
      />

      {/* Navigation Sidebar */}
      <NavigationSidebar
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
        title="Navigation"
      >
        <NavigationItem
          onClick={() => {
            setActiveSection('explore');
            setIsNavigationOpen(false);
          }}
          active={activeSection === 'explore'}
          icon="fas fa-search"
          label="Explore Stores"
          testId="button-nav-explore-navigation"
        />
        <NavigationItem
          onClick={() => {
            setActiveSection('cart');
            setIsNavigationOpen(false);
          }}
          active={activeSection === 'cart'}
          icon="fas fa-shopping-cart"
          label="Cart"
          badge={getItemCount()}
          testId="button-nav-cart-navigation"
        />
        <NavigationItem
          onClick={() => {
            setActiveSection('orders');
            setIsNavigationOpen(false);
          }}
          active={activeSection === 'orders'}
          icon="fas fa-receipt"
          label="My Orders"
          testId="button-nav-orders-navigation"
        />
        <NavigationItem
          onClick={() => {
            setActiveSection('retailers');
            setIsNavigationOpen(false);
          }}
          active={activeSection === 'retailers'}
          icon="fas fa-store-alt"
          label="Retailer Accounts"
          testId="button-nav-retailers-navigation"
        />
        <NavigationItem
          href="/shop/search"
          icon="fas fa-search"
          label="Search Wholesalers"
          testId="button-nav-search-navigation"
        />
        <NavigationItem
          onClick={() => {
            setActiveSection('khatabook');
            setIsNavigationOpen(false);
          }}
          active={activeSection === 'khatabook'}
          icon="fas fa-book"
          label="Khatabook"
          testId="button-nav-khatabook-navigation"
        />
      </NavigationSidebar>

      {/* Toast Notifications for Payment Change Requests */}
      <ToastNotifications />

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
    </div>
  );
}
