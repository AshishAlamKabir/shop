import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      const response = await fetch(`/api/retailer/catalog?search=${searchQuery}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  const createListingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/retailer/listings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/listings'] });
      toast({ title: "Product added to inventory successfully" });
      handleClose();
    },
    onError: () => {
      toast({ title: "Failed to add product to inventory", variant: "destructive" });
    }
  });

  const handleClose = () => {
    setSelectedProduct(null);
    setListingData({
      priceRetail: '',
      priceWholesale: '',
      stockQty: '',
      available: true
    });
    onClose();
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Product from Global Catalog</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-6 h-[60vh]">
          {/* Product Selection */}
          <div className="flex-1">
            <div className="mb-4">
              <Label htmlFor="search">Search Products</Label>
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="mt-1"
              />
            </div>
            
            <div className="space-y-2 overflow-y-auto h-full">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading products...</div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No products found</div>
              ) : (
                products.map((product: any) => (
                  <Card 
                    key={product.id} 
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedProduct?.id === product.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleProductSelect(product)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <img 
                          src={product.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=60&h=60'} 
                          alt={product.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">{product.brand} • {product.size}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{product.unit}</Badge>
                            {product.isWholesale && <Badge>Wholesale</Badge>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
          
          {/* Listing Configuration */}
          <div className="w-80 border-l pl-6">
            <h3 className="font-medium mb-4">Product Details</h3>
            
            {selectedProduct ? (
              <>
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <img 
                      src={selectedProduct.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=60&h=60'} 
                      alt={selectedProduct.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div>
                      <h4 className="font-medium">{selectedProduct.name}</h4>
                      <p className="text-sm text-muted-foreground">{selectedProduct.brand} • {selectedProduct.size}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="priceRetail">Retail Price (₹) *</Label>
                    <Input
                      id="priceRetail"
                      type="number"
                      step="0.01"
                      value={listingData.priceRetail}
                      onChange={(e) => setListingData(prev => ({ ...prev, priceRetail: e.target.value }))}
                      placeholder="Enter retail price"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="priceWholesale">Wholesale Price (₹)</Label>
                    <Input
                      id="priceWholesale"
                      type="number"
                      step="0.01"
                      value={listingData.priceWholesale}
                      onChange={(e) => setListingData(prev => ({ ...prev, priceWholesale: e.target.value }))}
                      placeholder="Enter wholesale price"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="stockQty">Initial Stock *</Label>
                    <Input
                      id="stockQty"
                      type="number"
                      value={listingData.stockQty}
                      onChange={(e) => setListingData(prev => ({ ...prev, stockQty: e.target.value }))}
                      placeholder="Enter stock quantity"
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
                    <Label htmlFor="available" className="text-sm">Available for sale</Label>
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-6">
                  <Button variant="outline" onClick={handleClose} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddListing} 
                    className="flex-1"
                    disabled={createListingMutation.isPending}
                  >
                    {createListingMutation.isPending ? 'Adding...' : 'Add to Inventory'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select a product from the catalog to configure pricing and stock
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}