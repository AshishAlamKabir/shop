import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/header";
import AddProductModal from "@/components/modals/add-product-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const { toast } = useToast();

  // Analytics Data
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/admin/analytics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    }
  });

  // Products Data
  const { data: products = [], isLoading: productsLoading } = useQuery({
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

  // Users Data
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Stores Data
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['/api/admin/stores'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stores', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stores');
      return response.json();
    }
  });

  // Orders Data
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/admin/orders'],
    queryFn: async () => {
      const response = await fetch('/api/admin/orders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'ACCEPTED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'READY': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'COMPLETED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'RETAILER': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'SHOP_OWNER': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'DELIVERY_BOY': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredUsers = users.filter((user: any) => 
    userFilter === '' || user.role === userFilter
  );

  const filteredStores = stores.filter((store: any) => 
    storeFilter === '' || 
    (storeFilter === 'open' && store.isOpen) ||
    (storeFilter === 'closed' && !store.isOpen)
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border p-6">
          <nav className="space-y-2">
            <Button
              onClick={() => setActiveSection('overview')}
              variant={activeSection === 'overview' ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="button-nav-overview"
            >
              <i className="fas fa-tachometer-alt mr-3"></i>
              Overview
            </Button>
            <Button
              onClick={() => setActiveSection('users')}
              variant={activeSection === 'users' ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="button-nav-users"
            >
              <i className="fas fa-users mr-3"></i>
              User Management
            </Button>
            <Button
              onClick={() => setActiveSection('stores')}
              variant={activeSection === 'stores' ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="button-nav-stores"
            >
              <i className="fas fa-store mr-3"></i>
              Store Oversight
            </Button>
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
              onClick={() => setActiveSection('orders')}
              variant={activeSection === 'orders' ? "default" : "ghost"}
              className="w-full justify-start"
              data-testid="button-nav-orders"
            >
              <i className="fas fa-receipt mr-3"></i>
              Order Monitoring
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
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div>
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-foreground mb-2">System Overview</h2>
                <p className="text-muted-foreground">Complete administrative control of your platform</p>
              </div>

              {analyticsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  {[1,2,3,4].map(i => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="animate-pulse">
                          <div className="h-4 bg-muted rounded mb-2"></div>
                          <div className="h-8 bg-muted rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-sm font-medium">Total Users</p>
                          <p className="text-3xl font-bold">{analytics?.totals?.users || 0}</p>
                        </div>
                        <i className="fas fa-users text-2xl text-blue-200"></i>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-sm font-medium">Active Stores</p>
                          <p className="text-3xl font-bold">{analytics?.totals?.stores || 0}</p>
                        </div>
                        <i className="fas fa-store text-2xl text-green-200"></i>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-sm font-medium">Products</p>
                          <p className="text-3xl font-bold">{analytics?.totals?.products || 0}</p>
                        </div>
                        <i className="fas fa-box text-2xl text-purple-200"></i>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-100 text-sm font-medium">Total Orders</p>
                          <p className="text-3xl font-bold">{analytics?.totals?.orders || 0}</p>
                        </div>
                        <i className="fas fa-shopping-cart text-2xl text-orange-200"></i>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Quick Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <i className="fas fa-users text-blue-500"></i>
                      Users by Role
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics?.usersByRole?.map((role: any) => (
                      <div key={role.role} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleColor(role.role)}>
                            {role.role.replace('_', ' ')}
                          </Badge>
                        </div>
                        <span className="font-semibold">{role.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <i className="fas fa-chart-pie text-green-500"></i>
                      Orders by Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics?.ordersByStatus?.map((status: any) => (
                      <div key={status.status} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(status.status)}>
                            {status.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <span className="font-semibold">{status.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <i className="fas fa-clock text-purple-500"></i>
                    Recent Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="space-y-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="animate-pulse flex space-x-4">
                          <div className="h-12 w-12 bg-muted rounded"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.slice(0, 5).map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                              <i className="fas fa-receipt text-primary-foreground text-sm"></i>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">#{order.id.slice(-8)}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.owner?.fullName} → {order.store?.name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                            <p className="text-sm font-medium text-foreground mt-1">₹{order.totalAmount}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Management Section */}
          {activeSection === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">User Management</h2>
                  <p className="text-muted-foreground">Manage all system users and their roles</p>
                </div>
                <div className="flex items-center space-x-4">
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-48" data-testid="select-user-role">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Roles</SelectItem>
                      <SelectItem value="ADMIN">Admins</SelectItem>
                      <SelectItem value="RETAILER">Retailers</SelectItem>
                      <SelectItem value="SHOP_OWNER">Shop Owners</SelectItem>
                      <SelectItem value="DELIVERY_BOY">Delivery Boys</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card>
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">User</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Role</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Phone</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Joined</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {usersLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                            Loading users...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                            No users found for the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user: any) => (
                          <tr key={user.id} data-testid={`row-user-${user.id}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                  <span className="text-primary-foreground font-medium text-sm">
                                    {user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">{user.fullName}</div>
                                  <div className="text-sm text-muted-foreground">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className={getRoleColor(user.role)}>
                                {user.role.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-foreground">{user.phone || 'Not provided'}</td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  data-testid={`button-view-user-${user.id}`}
                                >
                                  <i className="fas fa-eye"></i>
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  data-testid={`button-edit-user-${user.id}`}
                                >
                                  <i className="fas fa-edit"></i>
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

          {/* Store Management Section */}
          {activeSection === 'stores' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Store Oversight</h2>
                  <p className="text-muted-foreground">Monitor and manage all retail stores</p>
                </div>
                <div className="flex items-center space-x-4">
                  <Select value={storeFilter} onValueChange={setStoreFilter}>
                    <SelectTrigger className="w-48" data-testid="select-store-status">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Stores</SelectItem>
                      <SelectItem value="open">Open Stores</SelectItem>
                      <SelectItem value="closed">Closed Stores</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storesLoading ? (
                  [1,2,3,4,5,6].map(i => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="animate-pulse space-y-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-muted rounded"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : filteredStores.length === 0 ? (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        <i className="fas fa-store text-4xl mb-4 opacity-50"></i>
                        <p>No stores found for the selected filter.</p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  filteredStores.map((store: any) => (
                    <Card 
                      key={store.id} 
                      className="hover:shadow-lg transition-shadow"
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
                              <p className="text-sm text-muted-foreground">Store ID: {store.id.slice(-8)}</p>
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
                            <Badge variant={store.isOpen ? "default" : "secondary"}>
                              {store.isOpen ? 'Open' : 'Closed'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`button-view-store-${store.id}`}
                          >
                            <i className="fas fa-eye mr-1"></i>
                            View Details
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-edit-store-${store.id}`}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Product Catalog Section */}
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
                      {productsLoading ? (
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

          {/* Order Monitoring Section */}
          {activeSection === 'orders' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Order Monitoring</h2>
                <p className="text-muted-foreground">System-wide order oversight and management</p>
              </div>

              <div className="space-y-4">
                {ordersLoading ? (
                  [1,2,3,4,5].map(i => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="animate-pulse space-y-4">
                          <div className="flex justify-between">
                            <div className="space-y-2">
                              <div className="h-4 bg-muted rounded w-32"></div>
                              <div className="h-3 bg-muted rounded w-48"></div>
                            </div>
                            <div className="h-6 bg-muted rounded w-20"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : orders.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <i className="fas fa-receipt text-4xl mb-4 opacity-50"></i>
                      <p>No orders found in the system.</p>
                    </CardContent>
                  </Card>
                ) : (
                  orders.map((order: any) => (
                    <Card key={order.id} data-testid={`card-order-${order.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-semibold text-foreground">Order #{order.id.slice(-8)}</h4>
                            <p className="text-sm text-muted-foreground">
                              {order.owner?.fullName} → {order.store?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Placed on {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(order.status)} data-testid={`status-${order.id}`}>
                              {order.status.replace('_', ' ')}
                            </Badge>
                            <p className="font-semibold text-foreground mt-1">₹{order.totalAmount}</p>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <h5 className="font-medium text-foreground mb-2">Items ({order.items?.length || 0})</h5>
                          <div className="space-y-1">
                            {order.items?.slice(0, 3).map((item: any) => (
                              <div key={item.id} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {item.listing?.product?.name} x{item.qty}
                                </span>
                                <span className="text-foreground">₹{parseFloat(item.priceAt) * item.qty}</span>
                              </div>
                            ))}
                            {order.items?.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                +{order.items.length - 3} more items
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {order.deliveryType}
                            </Badge>
                            {order.deliveryAt && (
                              <span className="text-xs text-muted-foreground">
                                Delivery: {new Date(order.deliveryAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <i className="fas fa-eye mr-1"></i>
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Analytics Section */}
          {activeSection === 'analytics' && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Advanced Analytics</h2>
              
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="users">User Analytics</TabsTrigger>
                  <TabsTrigger value="orders">Order Analytics</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-blue-600">{analytics?.totals?.users || 0}</div>
                        <div className="text-sm text-muted-foreground">Total Users</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-green-600">{analytics?.totals?.stores || 0}</div>
                        <div className="text-sm text-muted-foreground">Active Stores</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-purple-600">{analytics?.totals?.products || 0}</div>
                        <div className="text-sm text-muted-foreground">Products</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="text-2xl font-bold text-orange-600">{analytics?.totals?.orders || 0}</div>
                        <div className="text-sm text-muted-foreground">Total Orders</div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="users">
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-muted-foreground">Detailed user analytics and insights coming soon...</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="orders">
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-muted-foreground">Order trends and analytics coming soon...</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="performance">
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-muted-foreground">System performance metrics coming soon...</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
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