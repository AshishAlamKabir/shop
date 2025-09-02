import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/header";
import AddProductModal from "@/components/modals/add-product-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('catalog');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['/api/admin/catalog', searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/admin/catalog?search=${searchQuery}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiRequest('DELETE', `/api/admin/catalog/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/catalog'] });
      toast({ title: "Product deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    }
  });

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProductMutation.mutate(productId);
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
              onClick={() => setActiveSection('catalog')}
              variant={activeSection === 'catalog' ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="button-nav-catalog"
            >
              <i className="fas fa-boxes mr-3"></i>
              Product Catalog
            </Button>
            <Button
              onClick={() => setActiveSection('analytics')}
              variant={activeSection === 'analytics' ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="button-nav-analytics"
            >
              <i className="fas fa-chart-line mr-3"></i>
              Analytics
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {activeSection === 'catalog' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Product Catalog</h2>
                  <p className="text-muted-foreground">Manage global product catalog for all retailers</p>
                </div>
                <Button 
                  onClick={() => setShowAddModal(true)}
                  data-testid="button-add-product"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Add Product
                </Button>
              </div>

              {/* Search and Filters */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-testid="input-search-products"
                      />
                    </div>
                    <Select>
                      <SelectTrigger className="w-48" data-testid="select-category">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="fashion">Fashion</SelectItem>
                        <SelectItem value="home">Home & Garden</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="secondary" data-testid="button-filter">
                      <i className="fas fa-filter mr-2"></i>
                      Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Product Table */}
              <Card>
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Product</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Brand</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Unit/Size</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Type</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Created</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                            Loading products...
                          </td>
                        </tr>
                      ) : products.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                            No products found. Add your first product to get started.
                          </td>
                        </tr>
                      ) : (
                        products.map((product: any) => (
                          <tr key={product.id} data-testid={`row-product-${product.id}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <img 
                                  src={product.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&h=80'} 
                                  alt={product.name}
                                  className="w-12 h-12 rounded-md object-cover"
                                />
                                <div>
                                  <div className="font-medium text-foreground">{product.name}</div>
                                  <div className="text-sm text-muted-foreground">{product.description || 'No description'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-foreground">{product.brand || 'No brand'}</td>
                            <td className="px-6 py-4 text-foreground">{product.unit} / {product.size || 'Standard'}</td>
                            <td className="px-6 py-4">
                              <Badge variant={product.isWholesale ? "default" : "secondary"}>
                                {product.isWholesale ? 'Wholesale' : 'Retail'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(product.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  data-testid={`button-edit-product-${product.id}`}
                                >
                                  <i className="fas fa-edit"></i>
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="text-destructive hover:text-destructive/80"
                                  data-testid={`button-delete-product-${product.id}`}
                                >
                                  <i className="fas fa-trash"></i>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'analytics' && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Analytics</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      <AddProductModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
    </div>
  );
}
