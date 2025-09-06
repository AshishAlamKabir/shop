import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddManualProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
}

export default function AddManualProductModal({ isOpen, onClose, storeId }: AddManualProductModalProps) {
  const [formData, setFormData] = useState({
    // Product fields
    productName: '',
    brand: '',
    unit: 'kg',
    size: '',
    imageUrl: '',
    isWholesale: false,
    // Listing fields
    priceRetail: '',
    priceWholesale: '',
    stockQty: '',
    available: true
  });
  
  const { toast } = useToast();

  const createProductAndListingMutation = useMutation({
    mutationFn: async (data: any) => {
      // First create the product
      const productData = {
        name: data.productName,
        brand: data.brand,
        unit: data.unit,
        size: data.size,
        imageUrl: data.imageUrl,
        isWholesale: data.isWholesale
      };
      
      const product = await apiRequest('POST', '/api/retailer/catalog', productData);
      
      // Then create the listing
      const listingData = {
        storeId,
        productId: (product as any).id,
        priceRetail: parseFloat(data.priceRetail),
        priceWholesale: data.priceWholesale ? parseFloat(data.priceWholesale) : null,
        stockQty: parseInt(data.stockQty),
        available: data.available
      };
      
      return await apiRequest('POST', '/api/retailer/listings', listingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/listings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/catalog'] });
      toast({ title: "Product created and added to inventory successfully" });
      handleClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create product", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    }
  });

  const handleClose = () => {
    setFormData({
      productName: '',
      brand: '',
      unit: 'kg',
      size: '',
      imageUrl: '',
      isWholesale: false,
      priceRetail: '',
      priceWholesale: '',
      stockQty: '',
      available: true
    });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productName || !formData.priceRetail || !formData.stockQty) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    createProductAndListingMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product Manually</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-medium text-sm text-muted-foreground">Product Information</h3>
            
            <div>
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                value={formData.productName}
                onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                placeholder="Enter product name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                placeholder="Enter brand name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="piece">piece</SelectItem>
                    <SelectItem value="box">box</SelectItem>
                    <SelectItem value="liter">liter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="size">Size/Pack</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                  placeholder="e.g., 500g"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="imageUrl">Product Image URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="wholesale"
                checked={formData.isWholesale}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isWholesale: !!checked }))}
              />
              <Label htmlFor="wholesale" className="text-sm">Wholesale product</Label>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Pricing & Stock</h3>
            
            <div>
              <Label htmlFor="priceRetail">Retail Price (₹) *</Label>
              <Input
                id="priceRetail"
                type="number"
                step="0.01"
                value={formData.priceRetail}
                onChange={(e) => setFormData(prev => ({ ...prev, priceRetail: e.target.value }))}
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
                value={formData.priceWholesale}
                onChange={(e) => setFormData(prev => ({ ...prev, priceWholesale: e.target.value }))}
                placeholder="Enter wholesale price"
              />
            </div>
            
            <div>
              <Label htmlFor="stockQty">Initial Stock *</Label>
              <Input
                id="stockQty"
                type="number"
                value={formData.stockQty}
                onChange={(e) => setFormData(prev => ({ ...prev, stockQty: e.target.value }))}
                placeholder="Enter stock quantity"
                required
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="available"
                checked={formData.available}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, available: !!checked }))}
              />
              <Label htmlFor="available" className="text-sm">Available for sale</Label>
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={createProductAndListingMutation.isPending}
            >
              {createProductAndListingMutation.isPending ? 'Creating...' : 'Create Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}