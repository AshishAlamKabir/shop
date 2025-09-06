import { useState } from "react";
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
import EnhancedKhatabook from "@/components/enhanced-khatabook";
import AddFromCatalogModal from "@/components/modals/add-from-catalog-modal";
import AddManualProductModal from "@/components/modals/add-manual-product-modal";
import { NavigationSidebar, NavigationItem } from "@/components/ui/navigation-sidebar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function RetailerDashboard() {
  const [activeSection, setActiveSection] = useState('orders');
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [newDeliveryBoy, setNewDeliveryBoy] = useState({ name: '', phone: '', address: '' });
  const [editingDeliveryBoy, setEditingDeliveryBoy] = useState<any>(null);
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; order: any }>({ isOpen: false, order: null });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<any>(null);
  const [deliveryAssignmentStep, setDeliveryAssignmentStep] = useState<'own' | 'find'>('own');
  const [recentlyCreatedDeliveryBoy, setRecentlyCreatedDeliveryBoy] = useState<any>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [deliveryRequestForm, setDeliveryRequestForm] = useState({ description: '', pickupAddress: '', dropoffAddress: '', estimatedReward: '' });
  const [editingStore, setEditingStore] = useState(false);
  const [storeFormData, setStoreFormData] = useState({
    name: '',
    address: '',
    city: '',
    pincode: '',
    phone: '',
    description: ''
  });
  const [editingListing, setEditingListing] = useState<any>(null);
  const [editListingForm, setEditListingForm] = useState({
    priceRetail: '',
    priceWholesale: '',
    stockQty: '',
    available: true
  });
  const [locationSearchForm, setLocationSearchForm] = useState({
    pickupLocation: '',
    deliveryLocation: ''
  });
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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

  const { data: deliveryBoys = [] } = useQuery({
    queryKey: ['/api/retailer/delivery-boys'],
    queryFn: async () => {
      const response = await fetch('/api/retailer/delivery-boys', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch delivery boys');
      return response.json();
    }
  });

  const { data: deliveryRequests = [] } = useQuery({
    queryKey: ['/api/retailer/delivery-requests'],
    queryFn: async () => {
      const response = await fetch('/api/retailer/delivery-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch delivery requests');
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
    mutationFn: async ({ orderId, amountReceived, note }: { orderId: string; amountReceived?: string; note?: string }) => {
      await apiRequest('POST', `/api/orders/${orderId}/payment-received`, { amountReceived, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/orders'] });
      setPaymentModal({ isOpen: false, order: null });
      setPaymentAmount('');
      setPaymentNote('');
      toast({ 
        title: "✅ Payment Confirmed", 
        description: "Shop owner has been notified of payment receipt" 
      });
    }
  });

  const handlePaymentSubmit = (order: any) => {
    const totalAmount = parseFloat(order.totalAmount);
    const amountReceived = paymentAmount ? parseFloat(paymentAmount) : totalAmount;
    
    if (amountReceived <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    
    if (amountReceived > totalAmount) {
      toast({ title: "Amount cannot exceed order total", variant: "destructive" });
      return;
    }
    
    confirmPaymentMutation.mutate({ 
      orderId: order.id, 
      amountReceived: amountReceived.toString(), 
      note: paymentNote 
    });
  };

  const createDeliveryBoyMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; address?: string }) => {
      const response = await apiRequest('POST', '/api/retailer/delivery-boys', data);
      return response;
    },
    onSuccess: (createdDeliveryBoy) => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/delivery-boys'] });
      toast({ title: "Delivery boy added successfully" });
      setNewDeliveryBoy({ name: '', phone: '', address: '' });
      setRecentlyCreatedDeliveryBoy(createdDeliveryBoy);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add delivery boy", 
        description: error.response?.data?.message || "An error occurred",
        variant: "destructive" 
      });
    }
  });

  const updateDeliveryBoyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest('PUT', `/api/retailer/delivery-boys/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/delivery-boys'] });
      toast({ title: "Delivery boy updated successfully" });
    }
  });

  const updateStoreMutation = useMutation({
    mutationFn: async (storeData: any) => {
      await apiRequest('POST', '/api/retailer/store', storeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/store/me'] });
      toast({ title: "Store information updated successfully" });
      setEditingStore(false);
    },
    onError: () => {
      toast({ title: "Failed to update store information", variant: "destructive" });
    }
  });

  const assignDeliveryBoyMutation = useMutation({
    mutationFn: async ({ orderId, deliveryBoyId }: { orderId: string; deliveryBoyId: string }) => {
      await apiRequest('POST', `/api/orders/${orderId}/assign-delivery-boy`, { deliveryBoyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/orders'] });
      toast({ title: "Delivery boy assigned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to assign delivery boy", variant: "destructive" });
    }
  });

  const deleteDeliveryBoyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/retailer/delivery-boys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/delivery-boys'] });
      toast({ title: "Delivery boy removed successfully" });
    }
  });

  const createDeliveryRequestMutation = useMutation({
    mutationFn: async (data: { description: string; pickupAddress: string; dropoffAddress: string; estimatedReward?: string }) => {
      await apiRequest('POST', '/api/retailer/delivery-requests', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/delivery-requests'] });
      toast({ title: "Delivery request posted successfully" });
      setDeliveryRequestForm({ description: '', pickupAddress: '', dropoffAddress: '', estimatedReward: '' });
    },
    onError: () => {
      toast({ title: "Failed to post delivery request", variant: "destructive" });
    }
  });

  const updateListingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest('PUT', `/api/retailer/listings/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/listings'] });
      toast({ title: "Product updated successfully" });
      setEditingListing(null);
      setEditListingForm({
        priceRetail: '',
        priceWholesale: '',
        stockQty: '',
        available: true
      });
    },
    onError: () => {
      toast({ title: "Failed to update product", variant: "destructive" });
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

  const handleEditListing = (listing: any) => {
    setEditingListing(listing);
    setEditListingForm({
      priceRetail: listing.priceRetail.toString(),
      priceWholesale: listing.priceWholesale?.toString() || '',
      stockQty: listing.stockQty?.toString() || '',
      available: listing.available
    });
  };

  const handleSaveListing = () => {
    if (!editingListing) return;
    
    const updateData = {
      priceRetail: parseFloat(editListingForm.priceRetail),
      priceWholesale: editListingForm.priceWholesale ? parseFloat(editListingForm.priceWholesale) : null,
      stockQty: parseInt(editListingForm.stockQty),
      available: editListingForm.available
    };

    updateListingMutation.mutate({ id: editingListing.id, data: updateData });
  };

  const toggleListingAvailability = (listing: any) => {
    updateListingMutation.mutate({ 
      id: listing.id, 
      data: { available: !listing.available }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onNavigationMenuClick={() => setIsNavigationOpen(true)} />
      
      <div className="h-[calc(100vh-80px)]">
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
                        <div className="flex space-x-2">
                          {editingStore && (
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setEditingStore(false);
                                setStoreFormData({
                                  name: '',
                                  address: '',
                                  city: '',
                                  pincode: '',
                                  phone: '',
                                  description: ''
                                });
                              }}
                              data-testid="button-cancel-store-edit"
                            >
                              <i className="fas fa-times mr-2"></i>
                              Cancel
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              if (editingStore) {
                                // Save store changes
                                updateStoreMutation.mutate(storeFormData);
                              } else {
                                // Start editing - populate form with current store data
                                setStoreFormData({
                                  name: store?.name || '',
                                  address: store?.address || '',
                                  city: store?.city || '',
                                  pincode: store?.pincode || '',
                                  phone: store?.phone || '',
                                  description: store?.description || ''
                                });
                                setEditingStore(true);
                              }
                            }}
                            disabled={updateStoreMutation.isPending}
                            data-testid="button-edit-store"
                          >
                            {updateStoreMutation.isPending ? (
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                            ) : editingStore ? (
                              <i className="fas fa-save mr-2"></i>
                            ) : (
                              <i className="fas fa-edit mr-2"></i>
                            )}
                            {editingStore ? 'Save' : 'Edit'}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-foreground">Store Name</Label>
                          <Input 
                            value={editingStore ? storeFormData.name : (store?.name || '')} 
                            readOnly={!editingStore}
                            onChange={(e) => editingStore && setStoreFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-2"
                            placeholder="Enter store name"
                            data-testid="input-store-name"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-foreground">City</Label>
                          <Input 
                            value={editingStore ? storeFormData.city : (store?.city || '')} 
                            readOnly={!editingStore}
                            onChange={(e) => editingStore && setStoreFormData(prev => ({ ...prev, city: e.target.value }))}
                            className="mt-2"
                            placeholder="Enter city"
                            data-testid="input-store-city"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-foreground">Pincode</Label>
                          <Input 
                            value={editingStore ? storeFormData.pincode : (store?.pincode || '')} 
                            readOnly={!editingStore}
                            onChange={(e) => editingStore && setStoreFormData(prev => ({ ...prev, pincode: e.target.value }))}
                            className="mt-2"
                            placeholder="Enter pincode"
                            data-testid="input-store-pincode"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-foreground">Phone</Label>
                          <Input 
                            value={editingStore ? storeFormData.phone : (store?.phone || '')} 
                            readOnly={!editingStore}
                            onChange={(e) => editingStore && setStoreFormData(prev => ({ ...prev, phone: e.target.value }))}
                            className="mt-2"
                            placeholder="Enter phone number"
                            data-testid="input-store-phone"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-foreground">Address</Label>
                          <Textarea 
                            value={editingStore ? storeFormData.address : (store?.address || '')} 
                            readOnly={!editingStore}
                            onChange={(e) => editingStore && setStoreFormData(prev => ({ ...prev, address: e.target.value }))}
                            rows={2} 
                            className="mt-2"
                            placeholder="Enter complete address"
                            data-testid="textarea-store-address"
                          />
                        </div>
                        {editingStore && (
                          <div className="md:col-span-2">
                            <Label className="text-sm font-medium text-foreground">Description</Label>
                            <Textarea 
                              value={storeFormData.description}
                              onChange={(e) => setStoreFormData(prev => ({ ...prev, description: e.target.value }))}
                              rows={2}
                              className="mt-2"
                              placeholder="Enter store description (optional)"
                              data-testid="textarea-store-description"
                            />
                          </div>
                        )}
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">Inventory Management</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">Add products manually or from global catalog</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => setShowManualModal(true)}
                    data-testid="button-add-manual-product"
                    className="w-full sm:w-auto"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Add Manually
                  </Button>
                  <Button 
                    onClick={() => setShowCatalogModal(true)}
                    data-testid="button-add-from-catalog"
                    className="w-full sm:w-auto"
                  >
                    <i className="fas fa-search mr-2"></i>
                    Add from Catalog
                  </Button>
                </div>
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
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1" 
                          onClick={() => handleEditListing(listing)}
                          data-testid={`button-edit-listing-${listing.id}`}
                        >
                          <i className="fas fa-edit mr-1"></i>
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleListingAvailability(listing)}
                          className={listing.available ? "text-orange-600 border-orange-600 hover:bg-orange-50" : "text-green-600 border-green-600 hover:bg-green-50"}
                          data-testid={`button-toggle-listing-${listing.id}`}
                        >
                          <i className={`fas ${listing.available ? 'fa-pause' : 'fa-play'}`}></i>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Edit Listing Modal */}
              <Dialog open={!!editingListing} onOpenChange={(open) => !open && setEditingListing(null)}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Product Details</DialogTitle>
                  </DialogHeader>
                  
                  {editingListing && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <img 
                          src={editingListing.product.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=60&h=60'} 
                          alt={editingListing.product.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div>
                          <h4 className="font-medium">{editingListing.product.name}</h4>
                          <p className="text-sm text-muted-foreground">{editingListing.product.brand} • {editingListing.product.size}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="editPriceRetail">Retail Price (₹)</Label>
                          <Input
                            id="editPriceRetail"
                            type="number"
                            step="0.01"
                            value={editListingForm.priceRetail}
                            onChange={(e) => setEditListingForm(prev => ({ ...prev, priceRetail: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="editStockQty">Stock Quantity</Label>
                          <Input
                            id="editStockQty"
                            type="number"
                            value={editListingForm.stockQty}
                            onChange={(e) => setEditListingForm(prev => ({ ...prev, stockQty: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="editPriceWholesale">Wholesale Price (₹) - Optional</Label>
                        <Input
                          id="editPriceWholesale"
                          type="number"
                          step="0.01"
                          value={editListingForm.priceWholesale}
                          onChange={(e) => setEditListingForm(prev => ({ ...prev, priceWholesale: e.target.value }))}
                          className="mt-1"
                          placeholder="Leave empty if not applicable"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="editAvailable"
                          checked={editListingForm.available}
                          onChange={(e) => setEditListingForm(prev => ({ ...prev, available: e.target.checked }))}
                          className="rounded"
                        />
                        <Label htmlFor="editAvailable">Available for sale</Label>
                      </div>
                      
                      <div className="flex space-x-3 pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setEditingListing(null)} 
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleSaveListing} 
                          className="flex-1"
                          disabled={updateListingMutation.isPending}
                        >
                          {updateListingMutation.isPending ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Updating...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-save mr-2"></i>
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
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
                          <h4 className="font-semibold text-foreground">{order.owner.fullName}</h4>
                          <p className="text-sm text-muted-foreground">{order.store?.city || order.store?.address || 'Location not specified'}</p>
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
                          {order.paymentReceived && (
                            <div className="flex items-center text-green-600 font-medium mt-2">
                              <i className="fas fa-check-circle mr-2"></i>
                              Payment Received ₹{order.amountReceived || order.totalAmount}
                            </div>
                          )}
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
                            <>
                              <Button 
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'READY' })}
                                data-testid={`button-ready-${order.id}`}
                              >
                                Mark Ready
                              </Button>
                              {order.deliveryType === 'DELIVERY' && (
                                <Button 
                                  variant="outline"
                                  onClick={() => {
                                    setActiveSection('delivery-boys');
                                  }}
                                  data-testid={`button-assign-delivery-${order.id}`}
                                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                >
                                  <i className="fas fa-motorcycle mr-2"></i>
                                  Assign Delivery
                                </Button>
                              )}
                            </>
                          )}
                          {order.status === 'READY' && (
                            <>
                              <Button 
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'OUT_FOR_DELIVERY' })}
                                data-testid={`button-out-for-delivery-${order.id}`}
                              >
                                Out for Delivery
                              </Button>
                              {order.deliveryType === 'DELIVERY' && (
                                <Button 
                                  variant="outline"
                                  onClick={() => {
                                    setActiveSection('delivery-boys');
                                  }}
                                  data-testid={`button-assign-delivery-${order.id}`}
                                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                >
                                  <i className="fas fa-motorcycle mr-2"></i>
                                  Assign Delivery
                                </Button>
                              )}
                            </>
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
                                  onClick={() => {
                                    setPaymentModal({ isOpen: true, order });
                                    setPaymentAmount(order.totalAmount);
                                  }}
                                  data-testid={`button-confirm-payment-${order.id}`}
                                  className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                >
                                  <i className="fas fa-money-bill mr-2"></i>
                                  Record Payment
                                </Button>
                              )}
                            </>
                          )}
                          {order.status === 'COMPLETED' && !order.paymentReceived && order.deliveryType === 'DELIVERY' && (
                            <Button 
                              variant="outline"
                              onClick={() => {
                                setPaymentModal({ isOpen: true, order });
                                setPaymentAmount(order.totalAmount);
                              }}
                              data-testid={`button-confirm-payment-${order.id}`}
                              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                            >
                              <i className="fas fa-money-bill mr-2"></i>
                              Record COD Payment
                            </Button>
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

          {/* Enhanced Khatabook Section */}
          {activeSection === 'khatabook' && (
            <EnhancedKhatabook />
          )}

          {/* Delivery Assignment Section */}
          {activeSection === 'delivery-assignment' && selectedOrderForDelivery && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Assign Delivery for Order</h2>
                <p className="text-muted-foreground">Choose how to assign delivery for this order</p>
              </div>

              {/* Order Details */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Order Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Shop Owner</Label>
                      <p className="font-medium text-foreground">{selectedOrderForDelivery.owner?.fullName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                      <p className="font-medium text-foreground">{selectedOrderForDelivery.store?.city || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
                      <p className="font-medium text-foreground">₹{selectedOrderForDelivery.totalAmount}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Order Date</Label>
                      <p className="font-medium text-foreground">{new Date(selectedOrderForDelivery.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Method Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className={`cursor-pointer transition-all ${deliveryAssignmentStep === 'own' ? 'ring-2 ring-primary' : ''}`} onClick={() => setDeliveryAssignmentStep('own')}>
                  <CardContent className="p-6 text-center">
                    <i className="fas fa-users text-3xl text-primary mb-4"></i>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Your Delivery Boys</h3>
                    <p className="text-sm text-muted-foreground">Assign to one of your registered delivery boys</p>
                  </CardContent>
                </Card>
                
                <Card className={`cursor-pointer transition-all ${deliveryAssignmentStep === 'find' ? 'ring-2 ring-primary' : ''}`} onClick={() => setDeliveryAssignmentStep('find')}>
                  <CardContent className="p-6 text-center">
                    <i className="fas fa-search text-3xl text-primary mb-4"></i>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Find Delivery Boys</h3>
                    <p className="text-sm text-muted-foreground">Share with available delivery boys in your area</p>
                  </CardContent>
                </Card>
              </div>

              {/* Own Delivery Boys Section */}
              {deliveryAssignmentStep === 'own' && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Select Your Delivery Boy</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {deliveryBoys.map((deliveryBoy: any) => (
                        <Card key={deliveryBoy.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                          assignDeliveryBoyMutation.mutate({ 
                            orderId: selectedOrderForDelivery.id, 
                            deliveryBoyId: deliveryBoy.id 
                          });
                          setSelectedOrderForDelivery(null);
                          setActiveSection('orders');
                        }}>
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                <i className="fas fa-motorcycle text-primary-foreground"></i>
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{deliveryBoy.name}</p>
                                <p className="text-sm text-muted-foreground">{deliveryBoy.phone}</p>
                                <p className="text-xs text-muted-foreground">{deliveryBoy.address}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {deliveryBoys.length === 0 && (
                        <div className="col-span-2 text-center py-8">
                          <i className="fas fa-motorcycle text-4xl text-muted-foreground mb-4"></i>
                          <p className="text-muted-foreground">No delivery boys added yet</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => setActiveSection('delivery-boys')}
                          >
                            Add Delivery Boy
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Find Delivery Boys Section */}
              {deliveryAssignmentStep === 'find' && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Share Delivery Request</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start space-x-3">
                        <i className="fas fa-info-circle text-blue-600 mt-1"></i>
                        <div>
                          <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Share this delivery request with all available delivery boys in your area</li>
                            <li>• Delivery boys will receive a notification with pickup and delivery details</li>
                            <li>• First delivery boy to accept will be automatically assigned</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-foreground">Pickup Address</Label>
                        <p className="text-sm text-muted-foreground mt-1">{store?.address || 'Store address not set'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">Delivery Address</Label>
                        <p className="text-sm text-muted-foreground mt-1">{selectedOrderForDelivery.store?.address || 'Customer address'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-foreground">Estimated Reward</Label>
                        <Input 
                          placeholder="Enter delivery fee (optional)" 
                          className="mt-1"
                          defaultValue="50"
                        />
                      </div>
                    </div>
                    
                    <div className="flex space-x-3 mt-6">
                      <Button 
                        onClick={async () => {
                          try {
                            await apiRequest('POST', `/api/orders/${selectedOrderForDelivery.id}/share-delivery`, {
                              estimatedReward: '50',
                              pickupAddress: store?.address || 'Store pickup location',
                              deliveryAddress: selectedOrderForDelivery.store?.address || 'Customer delivery location'
                            });
                            toast({ 
                              title: "🚚 Delivery Request Shared!", 
                              description: "All delivery boys in your area have been notified about this delivery request." 
                            });
                            setSelectedOrderForDelivery(null);
                            setActiveSection('orders');
                          } catch (error) {
                            toast({ 
                              title: "Failed to share delivery request", 
                              description: "Please try again later",
                              variant: "destructive" 
                            });
                          }
                        }}
                        className="flex-1"
                      >
                        <i className="fas fa-share mr-2"></i>
                        Share Delivery Request
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedOrderForDelivery(null);
                          setActiveSection('orders');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Delivery Boys Section */}
          {activeSection === 'delivery-boys' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Delivery Boy Management</h2>
                <p className="text-muted-foreground">Add and manage your delivery boys</p>
              </div>

              {/* Search Delivery Boys by Location */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Find Delivery Boys by Location</h3>
                  <p className="text-sm text-muted-foreground mb-4">Search for delivery boys who can handle deliveries in specific PIN CODE areas</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="pickup-location" className="text-sm font-medium text-foreground">Pickup Location (PIN CODE)</Label>
                      <Input
                        id="pickup-location"
                        value={locationSearchForm.pickupLocation}
                        onChange={(e) => setLocationSearchForm({ ...locationSearchForm, pickupLocation: e.target.value })}
                        placeholder="Enter pickup PIN CODE"
                        className="mt-2"
                        maxLength={6}
                        pattern="[0-9]*"
                      />
                    </div>
                    <div>
                      <Label htmlFor="delivery-location" className="text-sm font-medium text-foreground">Delivery Location (PIN CODE)</Label>
                      <Input
                        id="delivery-location"
                        value={locationSearchForm.deliveryLocation}
                        onChange={(e) => setLocationSearchForm({ ...locationSearchForm, deliveryLocation: e.target.value })}
                        placeholder="Enter delivery PIN CODE"
                        className="mt-2"
                        maxLength={6}
                        pattern="[0-9]*"
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={async () => {
                        if (!locationSearchForm.pickupLocation && !locationSearchForm.deliveryLocation) {
                          toast({ 
                            title: "Please enter at least one PIN CODE", 
                            variant: "destructive" 
                          });
                          return;
                        }
                        
                        setIsSearching(true);
                        try {
                          const params = new URLSearchParams();
                          if (locationSearchForm.pickupLocation) {
                            params.append('pickupLocation', locationSearchForm.pickupLocation);
                          }
                          if (locationSearchForm.deliveryLocation) {
                            params.append('deliveryLocation', locationSearchForm.deliveryLocation);
                          }
                          
                          const response = await fetch(`/api/retailer/delivery-boys/search-by-location?${params}`, {
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                            }
                          });
                          
                          if (!response.ok) throw new Error('Failed to search');
                          const results = await response.json();
                          setSearchResults(results);
                          
                          toast({ 
                            title: `Found ${results.length} delivery boys`,
                            description: results.length === 0 ? "Try searching with different PIN CODEs" : "Check the results below"
                          });
                        } catch (error) {
                          toast({ 
                            title: "Search failed", 
                            description: "Please try again later",
                            variant: "destructive" 
                          });
                        } finally {
                          setIsSearching(false);
                        }
                      }}
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                      ) : (
                        <i className="fas fa-search mr-2"></i>
                      )}
                      Search Delivery Boys
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setLocationSearchForm({ pickupLocation: '', deliveryLocation: '' });
                        setSearchResults([]);
                      }}
                    >
                      <i className="fas fa-times mr-2"></i>
                      Clear
                    </Button>
                  </div>
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-md font-semibold text-foreground mb-3">
                        <i className="fas fa-map-marker-alt mr-2"></i>
                        Search Results ({searchResults.length} found)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResults.map((deliveryBoy: any) => (
                          <Card key={deliveryBoy.id} className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3 mb-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <i className="fas fa-motorcycle text-blue-600 text-lg"></i>
                                </div>
                                <div>
                                  <h5 className="font-semibold text-foreground">{deliveryBoy.name}</h5>
                                  <span className="text-xs text-green-600 font-medium">Available</span>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center text-muted-foreground">
                                  <i className="fas fa-phone mr-2 w-4"></i>
                                  <span>{deliveryBoy.phone}</span>
                                </div>
                                {deliveryBoy.address && (
                                  <div className="flex items-center text-muted-foreground">
                                    <i className="fas fa-map-marker-alt mr-2 w-4"></i>
                                    <span className="text-xs">{deliveryBoy.address}</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add New Delivery Boy Form */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Add New Delivery Boy</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="delivery-boy-name" className="text-sm font-medium text-foreground">Full Name</Label>
                      <Input
                        id="delivery-boy-name"
                        value={newDeliveryBoy.name}
                        onChange={(e) => setNewDeliveryBoy({ ...newDeliveryBoy, name: e.target.value })}
                        placeholder="Enter delivery boy name"
                        className="mt-2"
                        data-testid="input-delivery-boy-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="delivery-boy-phone" className="text-sm font-medium text-foreground">Phone Number</Label>
                      <Input
                        id="delivery-boy-phone"
                        value={newDeliveryBoy.phone}
                        onChange={(e) => setNewDeliveryBoy({ ...newDeliveryBoy, phone: e.target.value })}
                        placeholder="Enter phone number"
                        className="mt-2"
                        data-testid="input-delivery-boy-phone"
                      />
                    </div>
                    <div>
                      <Label htmlFor="delivery-boy-address" className="text-sm font-medium text-foreground">Address</Label>
                      <Input
                        id="delivery-boy-address"
                        value={newDeliveryBoy.address}
                        onChange={(e) => setNewDeliveryBoy({ ...newDeliveryBoy, address: e.target.value })}
                        placeholder="Enter address (optional)"
                        className="mt-2"
                        data-testid="input-delivery-boy-address"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button
                      onClick={() => {
                        if (newDeliveryBoy.name && newDeliveryBoy.phone) {
                          createDeliveryBoyMutation.mutate(newDeliveryBoy);
                        } else {
                          toast({ title: "Please fill in required fields", variant: "destructive" });
                        }
                      }}
                      disabled={createDeliveryBoyMutation.isPending}
                      data-testid="button-add-delivery-boy"
                    >
                      {createDeliveryBoyMutation.isPending ? (
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                      ) : (
                        <i className="fas fa-plus mr-2"></i>
                      )}
                      Add Delivery Boy
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recently Created Delivery Boy Profile */}
              {recentlyCreatedDeliveryBoy && (
                <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                        <i className="fas fa-check-circle mr-2"></i>
                        Delivery Boy Added Successfully
                      </h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setRecentlyCreatedDeliveryBoy(null)}
                        data-testid="button-close-profile"
                      >
                        <i className="fas fa-times"></i>
                      </Button>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                          <i className="fas fa-motorcycle text-primary text-2xl"></i>
                        </div>
                        <div>
                          <h4 className="text-xl font-semibold text-foreground" data-testid="profile-name">
                            {recentlyCreatedDeliveryBoy.name}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-sm text-muted-foreground">Active</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <i className="fas fa-phone mr-3 w-4 text-muted-foreground"></i>
                            <span className="font-medium text-foreground" data-testid="profile-phone">
                              {recentlyCreatedDeliveryBoy.phone}
                            </span>
                          </div>
                          {recentlyCreatedDeliveryBoy.address && (
                            <div className="flex items-center text-sm">
                              <i className="fas fa-map-marker-alt mr-3 w-4 text-muted-foreground"></i>
                              <span className="text-foreground" data-testid="profile-address">
                                {recentlyCreatedDeliveryBoy.address}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <i className="fas fa-calendar mr-3 w-4 text-muted-foreground"></i>
                            <span className="text-foreground">
                              Added {new Date(recentlyCreatedDeliveryBoy.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <i className="fas fa-id-badge mr-3 w-4 text-muted-foreground"></i>
                            <span className="text-xs text-muted-foreground font-mono">
                              ID: {recentlyCreatedDeliveryBoy.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Delivery Boys List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deliveryBoys.map((deliveryBoy: any) => (
                  <Card key={deliveryBoy.id} className="hover:shadow-md transition-shadow" data-testid={`card-delivery-boy-${deliveryBoy.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <i className="fas fa-motorcycle text-primary text-xl"></i>
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground" data-testid={`name-${deliveryBoy.id}`}>
                              {deliveryBoy.name}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className={`w-2 h-2 rounded-full ${deliveryBoy.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                              <span className="text-xs text-muted-foreground">
                                {deliveryBoy.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <i className="fas fa-phone mr-2 w-4"></i>
                          <span data-testid={`phone-${deliveryBoy.id}`}>{deliveryBoy.phone}</span>
                        </div>
                        {deliveryBoy.address && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <i className="fas fa-map-marker-alt mr-2 w-4"></i>
                            <span data-testid={`address-${deliveryBoy.id}`}>{deliveryBoy.address}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm text-muted-foreground">
                          <i className="fas fa-calendar mr-2 w-4"></i>
                          <span>Added {new Date(deliveryBoy.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const newStatus = !deliveryBoy.isActive;
                            updateDeliveryBoyMutation.mutate({
                              id: deliveryBoy.id,
                              data: { isActive: newStatus }
                            });
                          }}
                          disabled={updateDeliveryBoyMutation.isPending}
                          data-testid={`button-toggle-${deliveryBoy.id}`}
                        >
                          <i className={`fas ${deliveryBoy.isActive ? 'fa-pause' : 'fa-play'} mr-1`}></i>
                          {deliveryBoy.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove ${deliveryBoy.name}?`)) {
                              deleteDeliveryBoyMutation.mutate(deliveryBoy.id);
                            }
                          }}
                          disabled={deleteDeliveryBoyMutation.isPending}
                          data-testid={`button-delete-${deliveryBoy.id}`}
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {deliveryBoys.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <i className="fas fa-motorcycle text-4xl text-muted-foreground mb-4"></i>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No delivery boys added yet</h3>
                    <p className="text-muted-foreground">Add your first delivery boy to start managing deliveries</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delivery Requests Section */}
          {activeSection === 'delivery-requests' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Delivery Requests</h2>
                <p className="text-muted-foreground">Post and manage delivery requests for independent delivery boys</p>
              </div>

              {/* Create New Delivery Request */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Post New Delivery Request</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-foreground">Description</Label>
                      <Textarea
                        value={deliveryRequestForm.description}
                        onChange={(e) => setDeliveryRequestForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what needs to be delivered"
                        rows={3}
                        className="mt-2"
                        data-testid="textarea-delivery-description"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground">Estimated Reward (₹)</Label>
                      <Input
                        type="number"
                        value={deliveryRequestForm.estimatedReward}
                        onChange={(e) => setDeliveryRequestForm(prev => ({ ...prev, estimatedReward: e.target.value }))}
                        placeholder="Enter estimated reward amount"
                        className="mt-2"
                        data-testid="input-estimated-reward"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground">Pickup Address</Label>
                      <Textarea
                        value={deliveryRequestForm.pickupAddress}
                        onChange={(e) => setDeliveryRequestForm(prev => ({ ...prev, pickupAddress: e.target.value }))}
                        placeholder="Enter pickup address"
                        rows={2}
                        className="mt-2"
                        data-testid="textarea-pickup-address"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground">Drop-off Address</Label>
                      <Textarea
                        value={deliveryRequestForm.dropoffAddress}
                        onChange={(e) => setDeliveryRequestForm(prev => ({ ...prev, dropoffAddress: e.target.value }))}
                        placeholder="Enter drop-off address"
                        rows={2}
                        className="mt-2"
                        data-testid="textarea-dropoff-address"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => createDeliveryRequestMutation.mutate(deliveryRequestForm)}
                      disabled={createDeliveryRequestMutation.isPending || !deliveryRequestForm.description || !deliveryRequestForm.pickupAddress || !deliveryRequestForm.dropoffAddress}
                      data-testid="button-post-delivery-request"
                    >
                      {createDeliveryRequestMutation.isPending ? (
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                      ) : (
                        <i className="fas fa-plus mr-2"></i>
                      )}
                      Post Request
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Requests List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deliveryRequests.map((request: any) => (
                  <Card key={request.id} className="hover:shadow-md transition-shadow" data-testid={`card-delivery-request-${request.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge 
                          className={
                            request.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                            request.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                            request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }
                          data-testid={`badge-status-${request.id}`}
                        >
                          {request.status}
                        </Badge>
                        {request.estimatedReward && (
                          <div className="text-lg font-semibold text-primary">
                            ₹{request.estimatedReward}
                          </div>
                        )}
                      </div>
                      
                      <h4 className="font-medium text-foreground mb-2" data-testid={`text-description-${request.id}`}>
                        {request.description}
                      </h4>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Pickup:</span>
                          <p className="text-foreground">{request.pickupAddress}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Drop-off:</span>
                          <p className="text-foreground">{request.dropoffAddress}</p>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Posted: {new Date(request.createdAt).toLocaleDateString()}</span>
                          {request.acceptedBy && (
                            <span>Accepted by delivery boy</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {deliveryRequests.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <i className="fas fa-truck text-4xl text-muted-foreground mb-4"></i>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No delivery requests yet</h3>
                    <p className="text-muted-foreground">Post your first delivery request to connect with delivery boys</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Enhanced Payment Recording Modal */}
      <Dialog open={paymentModal.isOpen} onOpenChange={(open) => setPaymentModal({ isOpen: open, order: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment - Order #{paymentModal.order?.id?.slice(-8)}</DialogTitle>
          </DialogHeader>
          
          {paymentModal.order && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Order Total:</span>
                  <span className="font-semibold">₹{paymentModal.order.totalAmount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Customer:</span>
                  <span className="text-sm">{paymentModal.order.owner?.fullName}</span>
                </div>
              </div>
              
              <div>
                <Label htmlFor="payment-amount" className="text-sm font-medium">
                  Amount Received <span className="text-muted-foreground">(₹)</span>
                </Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={paymentModal.order.totalAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount received"
                  className="mt-2"
                  data-testid="input-payment-amount"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for full payment of ₹{paymentModal.order.totalAmount}
                </p>
              </div>
              
              <div>
                <Label htmlFor="payment-note" className="text-sm font-medium">
                  Payment Notes <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Textarea
                  id="payment-note"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Add notes about partial payment, customer conditions, etc."
                  className="mt-2"
                  rows={3}
                  data-testid="textarea-payment-note"
                />
              </div>
              
              {paymentAmount && parseFloat(paymentAmount) < parseFloat(paymentModal.order.totalAmount) && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <div className="flex items-center text-yellow-800">
                    <i className="fas fa-exclamation-triangle mr-2"></i>
                    <span className="text-sm font-medium">Partial Payment</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Outstanding balance: ₹{(parseFloat(paymentModal.order.totalAmount) - parseFloat(paymentAmount || '0')).toFixed(2)}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    This will be tracked in the customer's khatabook for future settlement
                  </p>
                </div>
              )}
              
              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPaymentModal({ isOpen: false, order: null })}
                  className="flex-1"
                  data-testid="button-cancel-payment"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handlePaymentSubmit(paymentModal.order)}
                  disabled={confirmPaymentMutation.isPending}
                  className="flex-1"
                  data-testid="button-confirm-payment-modal"
                >
                  {confirmPaymentMutation.isPending ? (
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                  ) : (
                    <i className="fas fa-check mr-2"></i>
                  )}
                  Record Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual Product Modal */}
      <AddManualProductModal 
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        storeId={store?.id || ''}
      />

      {/* Catalog Selection Modal */}
      <AddFromCatalogModal 
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        storeId={store?.id || ''}
      />

      {/* Navigation Sidebar */}
      <NavigationSidebar
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
        title="Navigation"
      >
        <NavigationItem
          onClick={() => {
            setActiveSection('orders');
            setIsNavigationOpen(false);
          }}
          active={activeSection === 'orders'}
          icon="fas fa-receipt"
          label="Orders"
          badge={pendingOrders.length}
          testId="button-nav-orders-navigation"
        />
        <NavigationItem
          onClick={() => {
            setActiveSection('delivery-boys');
            setIsNavigationOpen(false);
          }}
          active={activeSection === 'delivery-boys'}
          icon="fas fa-motorcycle"
          label="Delivery Boy"
          testId="button-nav-delivery-boys-navigation"
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
        <NavigationItem
          onClick={() => {
            setActiveSection('listings');
            setIsNavigationOpen(false);
          }}
          active={activeSection === 'listings'}
          icon="fas fa-box"
          label="Inventory"
          testId="button-nav-listings-navigation"
        />
        <NavigationItem
          onClick={() => {
            setActiveSection('store');
            setIsNavigationOpen(false);
          }}
          active={activeSection === 'store'}
          icon="fas fa-store"
          label="My Store"
          testId="button-nav-store-navigation"
        />
      </NavigationSidebar>
    </div>
  );
}
