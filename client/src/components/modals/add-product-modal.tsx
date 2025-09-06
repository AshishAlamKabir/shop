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

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddProductModal({ isOpen, onClose }: AddProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    unit: 'kg',
    size: '',
    imageUrl: '',
    isWholesale: false
  });
  
  const { toast } = useToast();

  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      return await apiRequest('POST', '/api/retailer/catalog', productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/retailer/catalog'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/catalog'] });
      toast({ title: "Product added successfully" });
      onClose();
      setFormData({
        name: '',
        brand: '',
        unit: 'kg',
        size: '',
        imageUrl: '',
        isWholesale: false
      });
    },
    onError: () => {
      toast({ title: "Failed to add product", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProductMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="productName">Product Name</Label>
            <Input
              id="productName"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter product name"
              required
              data-testid="input-product-name"
            />
          </div>
          
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
              placeholder="Enter brand name"
              data-testid="input-product-brand"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}>
                <SelectTrigger data-testid="select-product-unit">
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
                data-testid="input-product-size"
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
              data-testid="input-product-image"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="wholesale"
              checked={formData.isWholesale}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isWholesale: !!checked }))}
              data-testid="checkbox-wholesale"
            />
            <Label htmlFor="wholesale" className="text-sm">Wholesale product</Label>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={createProductMutation.isPending}
              data-testid="button-submit-product"
            >
              {createProductMutation.isPending ? 'Adding...' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
