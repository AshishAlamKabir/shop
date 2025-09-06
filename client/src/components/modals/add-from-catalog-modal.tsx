import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddFromCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
}

export default function AddFromCatalogModal({ isOpen, onClose, storeId }: AddFromCatalogModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('search');
  const [listingData, setListingData] = useState({
    priceRetail: '',
    priceWholesale: '',
    stockQty: '',
    available: true
  });
  
  const { toast } = useToast();

  // Fetch global catalog products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['/api/retailer/catalog', searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/retailer/catalog?search=${searchQuery}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: isOpen
  });

  // Fetch retailer's previous products (products they used to sell)
  const { data: previousProducts = [] } = useQuery({
    queryKey: ['/api/retailer/previous-products'],
    queryFn: async () => {
      const response = await fetch('/api/retailer/listings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (response.ok) {
        const listings = await response.json();
        return listings.map((listing: any) => listing.product);
      }
      return [];
    },
    enabled: isOpen
  });

  const createListingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/retailer/listings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/previous-products'] });
      toast({ 
        title: "✅ Product Added to Store", 
        description: "Product is now available for shop owners to order" 
      });
      setSelectedProduct(null);
      setListingData({
        priceRetail: '',
        priceWholesale: '',
        stockQty: '',
        available: true
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add product to store", 
        description: error.response?.data?.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  const handleClose = () => {
    setSelectedProduct(null);
    setSearchQuery('');
    setActiveTab('search');
    setListingData({
      priceRetail: '',
      priceWholesale: '',
      stockQty: '',
      available: true
    });
    onClose();
  };

  const handleQuickAdd = (product: any) => {
    setSelectedProduct(product);
    // Pre-fill with suggested prices if available
    setListingData({
      priceRetail: '',
      priceWholesale: '',
      stockQty: '10', // Default stock
      available: true
    });
    setActiveTab('search'); // Switch to main tab for configuration
  };

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
  };

  const handleAddListing = () => {
    if (!selectedProduct) {
      toast({ title: "Please select a product", variant: "destructive" });
      return;
    }

    if (!listingData.priceRetail || !listingData.stockQty) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    createListingMutation.mutate({
      storeId,
      productId: selectedProduct.id,
      priceRetail: parseFloat(listingData.priceRetail),
      priceWholesale: listingData.priceWholesale ? parseFloat(listingData.priceWholesale) : null,
      stockQty: parseInt(listingData.stockQty),
      available: listingData.available
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Add Products to Your Store</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[75vh] sm:h-[70vh]">
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="search" className="text-xs sm:text-sm">Search Catalog</TabsTrigger>
            <TabsTrigger value="previous" className="text-xs sm:text-sm">My Usual Products ({previousProducts.length})</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 mt-2">
            <TabsContent value="search" className="flex-1 mt-0 lg:flex-initial lg:w-3/5">
              <div className="mb-3">
                <Label htmlFor="search" className="text-sm font-medium">Search Products by Name</Label>
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type product name to search..."
                  className="mt-1"
                />
              </div>
              
              <div className="space-y-2 overflow-y-auto h-[40vh] lg:h-full">
                {isLoading ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <i className="fas fa-spinner fa-spin text-xl sm:text-2xl mb-2"></i>
                    <br />Loading products...
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <i className="fas fa-search text-2xl sm:text-3xl mb-3"></i>
                    <br />
                    <span className="text-sm sm:text-base">
                      {searchQuery ? 'No products found for your search' : 'Start typing to search products'}
                    </span>
                  </div>
                ) : (
                  products.map((product: any) => (
                    <Card 
                      key={product.id} 
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedProduct?.id === product.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleProductSelect(product)}
                    >
                      <CardContent className="p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img 
                              src={product.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=60&h=60'} 
                              alt={product.name}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm sm:text-base truncate">{product.name}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground">{product.brand} • {product.size}</p>
                              <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">{product.unit}</Badge>
                                {product.isWholesale && <Badge className="text-xs">Wholesale</Badge>}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAdd(product);
                            }}
                            className="w-full sm:w-auto sm:ml-4 text-xs sm:text-sm"
                          >
                            <i className="fas fa-plus mr-1"></i>
                            Add to Store
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="previous" className="flex-1 mt-0 lg:flex-initial lg:w-3/5">
              <div className="mb-3">
                <h3 className="font-medium text-foreground text-sm sm:text-base">Products You Usually Keep</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Quick add your frequently stocked items</p>
              </div>
              
              <div className="space-y-2 overflow-y-auto h-[40vh] lg:h-full">
                {previousProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <i className="fas fa-history text-2xl sm:text-3xl mb-3"></i>
                    <br />
                    <h3 className="text-base sm:text-lg font-medium mb-2">No previous products yet</h3>
                    <p className="text-xs sm:text-sm px-4">Start adding products from the catalog to build your usual inventory</p>
                  </div>
                ) : (
                  previousProducts.map((product: any) => (
                    <Card 
                      key={product.id} 
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                    >
                      <CardContent className="p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img 
                              src={product.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=60&h=60'} 
                              alt={product.name}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm sm:text-base truncate">{product.name}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground">{product.brand} • {product.size}</p>
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">{product.unit}</Badge>
                                {product.isWholesale && <Badge className="text-xs">Wholesale</Badge>}
                                <Badge variant="secondary" className="text-xs">Previously stocked</Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleQuickAdd(product)}
                            className="w-full sm:w-auto sm:ml-4 text-xs sm:text-sm"
                          >
                            <i className="fas fa-plus mr-1"></i>
                            Add Again
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          
          {/* Listing Configuration */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6">
            <h3 className="font-medium mb-3 text-sm sm:text-base">Product Details</h3>
            
            {selectedProduct ? (
              <>
                <div className="mb-3 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <img 
                      src={selectedProduct.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=60&h=60'} 
                      alt={selectedProduct.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm sm:text-base truncate">{selectedProduct.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">{selectedProduct.brand} • {selectedProduct.size}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="priceRetail" className="text-sm font-medium">Retail Price (₹) *</Label>
                    <Input
                      id="priceRetail"
                      type="number"
                      step="0.01"
                      value={listingData.priceRetail}
                      onChange={(e) => setListingData(prev => ({ ...prev, priceRetail: e.target.value }))}
                      placeholder="Enter retail price"
                      className="text-sm"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="priceWholesale" className="text-sm font-medium">Wholesale Price (₹)</Label>
                    <Input
                      id="priceWholesale"
                      type="number"
                      step="0.01"
                      value={listingData.priceWholesale}
                      onChange={(e) => setListingData(prev => ({ ...prev, priceWholesale: e.target.value }))}
                      placeholder="Enter wholesale price"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="stockQty" className="text-sm font-medium">Initial Stock *</Label>
                    <Input
                      id="stockQty"
                      type="number"
                      value={listingData.stockQty}
                      onChange={(e) => setListingData(prev => ({ ...prev, stockQty: e.target.value }))}
                      placeholder="Enter stock quantity"
                      className="text-sm"
                      required
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="available"
                      checked={listingData.available}
                      onChange={(e) => setListingData(prev => ({ ...prev, available: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="available" className="text-xs sm:text-sm">Available for sale</Label>
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button variant="outline" onClick={handleClose} className="flex-1 text-xs sm:text-sm">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddListing} 
                    className="flex-1 text-xs sm:text-sm"
                    disabled={createListingMutation.isPending}
                  >
                    {createListingMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-1 sm:mr-2"></i>
                        <span className="hidden sm:inline">Adding to Store...</span>
                        <span className="sm:hidden">Adding...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-store mr-1 sm:mr-2"></i>
                        <span className="hidden sm:inline">Add to My Store</span>
                        <span className="sm:hidden">Add to Store</span>
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground px-4">
                <p className="text-xs sm:text-sm">Select a product from the catalog to configure pricing and stock</p>
              </div>
            )}
          </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}