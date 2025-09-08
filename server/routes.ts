import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { insertUserSchema, insertStoreSchema, insertProductCatalogSchema, insertListingSchema, insertOrderSchema, insertDeliveryRequestSchema } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Middleware for authentication
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Middleware for role authorization
const requireRole = (...roles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket setup for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocket>();
  
  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    
    if (userId) {
      clients.set(userId, ws);
      console.log(`User ${userId} connected to WebSocket`);
    }

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`User ${userId} disconnected from WebSocket`);
      }
    });
  });

  // Helper function to emit order events
  const emitOrderEvent = (orderId: string, ownerId: string, retailerId: string, event: string, payload: any) => {
    [ownerId, retailerId].forEach(userId => {
      const client = clients.get(userId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ orderId, event, payload }));
      }
    });
  };

  // Helper function to broadcast delivery notifications to all delivery boys
  const broadcastToDeliveryBoys = (event: string, payload: any) => {
    clients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN) {
        // We'll check if user is delivery boy when sending
        client.send(JSON.stringify({ type: event, payload }));
      }
    });
  };

  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(userData.passwordHash, 10);
      
      const user = await storage.createUser({
        ...userData,
        passwordHash
      });
      
      res.status(201).json({ message: 'User created successfully', userId: user.id });
    } catch (error) {
      res.status(400).json({ message: 'Invalid input data' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      
      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Refresh access token using refresh token
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token required' });
      }
      
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
      const user = await storage.getUserById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }
      
      // Generate new access token
      const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      
      res.json({ accessToken });
    } catch (error) {
      res.status(403).json({ message: 'Invalid refresh token' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', authenticateToken, async (req: any, res) => {
    // In a more complex app, you might invalidate the token in a blacklist
    // For now, just return success - token cleanup is handled client-side
    res.json({ message: 'Logout successful' });
  });

  app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role
      }
    });
  });

  // Update user profile
  app.patch('/api/auth/profile', authenticateToken, async (req: any, res) => {
    try {
      const { fullName, email, phone } = req.body;
      
      // Check if email is being changed and if it's already in use
      if (email && email !== req.user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      const updatedUser = await storage.updateUser(req.user.id, {
        fullName,
        email,
        phone
      });

      res.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          role: updatedUser.role,
          phone: updatedUser.phone
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  // Change user password
  app.post('/api/auth/change-password', authenticateToken, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Verify current password
      const user = await storage.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      
      await storage.updateUser(req.user.id, {
        passwordHash: newPasswordHash
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to change password' });
    }
  });

  // Admin routes - Product Catalog
  app.post('/api/admin/catalog', authenticateToken, requireRole('ADMIN'), async (req: any, res) => {
    try {
      const productData = insertProductCatalogSchema.parse({
        ...req.body,
        createdById: req.user.id
      });
      
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: 'Invalid product data' });
    }
  });

  app.get('/api/admin/catalog', authenticateToken, requireRole('ADMIN'), async (req: any, res) => {
    try {
      const { search, page = 1, limit = 20 } = req.query;
      const products = await storage.getProducts({ search, page: parseInt(page), limit: parseInt(limit) });
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  app.put('/api/admin/catalog/:id', authenticateToken, requireRole('ADMIN'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const product = await storage.updateProduct(id, updateData);
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: 'Failed to update product' });
    }
  });

  app.delete('/api/admin/catalog/:id', authenticateToken, requireRole('ADMIN'), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProduct(id);
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(400).json({ message: 'Failed to delete product' });
    }
  });

  // Admin routes - User Management
  app.get('/api/admin/users', authenticateToken, requireRole('ADMIN'), async (req: any, res) => {
    try {
      const { page = 1, limit = 20, role, search } = req.query;
      // For now, we'll get all users. In a real system, you'd implement pagination and filtering
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/stores', authenticateToken, requireRole('ADMIN'), async (req: any, res) => {
    try {
      const { search, city, status } = req.query;
      const stores = await storage.getStores({ search, city });
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch stores' });
    }
  });

  app.get('/api/admin/orders', authenticateToken, requireRole('ADMIN'), async (req: any, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const orders = await storage.getAllOrdersForAdmin();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.get('/api/admin/analytics', authenticateToken, requireRole('ADMIN'), async (req: any, res) => {
    try {
      const analytics = await storage.getSystemAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  // Retailer access to global catalog for adding products
  app.get('/api/retailer/catalog', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { search, page = 1, limit = 50 } = req.query;
      const products = await storage.getProducts({ search, page: parseInt(page), limit: parseInt(limit) });
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  // Allow retailers to create products in the global catalog
  app.post('/api/retailer/catalog', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const productData = insertProductCatalogSchema.parse({
        ...req.body,
        createdById: req.user.id
      });
      
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: 'Invalid product data' });
    }
  });

  // Retailer routes - Store management
  app.post('/api/retailer/store', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const existingStore = await storage.getStoreByOwnerId(req.user.id);
      
      if (existingStore) {
        // Update existing store
        const updateData = req.body;
        const store = await storage.updateStore(existingStore.id, updateData);
        res.json(store);
      } else {
        // Create new store
        const storeData = insertStoreSchema.parse({
          ...req.body,
          ownerId: req.user.id
        });
        const store = await storage.createStore(storeData);
        res.status(201).json(store);
      }
    } catch (error) {
      res.status(400).json({ message: 'Invalid store data' });
    }
  });

  app.get('/api/retailer/store/me', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const store = await storage.getStoreByOwnerId(req.user.id);
      res.json(store);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch store' });
    }
  });

  // Retailer routes - Listings
  app.post('/api/retailer/listings', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const store = await storage.getStoreByOwnerId(req.user.id);
      if (!store) {
        return res.status(400).json({ message: 'Store not found' });
      }
      
      const listingData = insertListingSchema.parse({
        ...req.body,
        storeId: store.id
      });
      
      const listing = await storage.createListing(listingData);
      res.status(201).json(listing);
    } catch (error) {
      console.error('Listing creation error:', error);
      console.error('Request body:', req.body);
      res.status(400).json({ 
        message: 'Invalid listing data', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/retailer/listings', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const store = await storage.getStoreByOwnerId(req.user.id);
      if (!store) {
        return res.status(400).json({ message: 'Store not found' });
      }
      
      const { available, search } = req.query;
      const listings = await storage.getListingsByStore(store.id, { 
        available: available ? available === 'true' : undefined,
        search: search as string
      });
      res.json(listings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch listings' });
    }
  });

  app.put('/api/retailer/listings/:id', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const listing = await storage.updateListing(id, updateData);
      res.json(listing);
    } catch (error) {
      res.status(400).json({ message: 'Failed to update listing' });
    }
  });

  // Delivery Boy routes for retailers - Updated to use users table
  app.get('/api/retailer/delivery-boys', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const deliveryBoys = await storage.getLinkedDeliveryBoys(req.user.id);
      res.json(deliveryBoys);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get delivery boys' });
    }
  });

  // Search delivery boys by ID route - Updated to use users table (MUST come before :id route)
  app.get('/api/retailer/delivery-boys/search-by-id', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { deliveryBoyId } = req.query;
      
      if (!deliveryBoyId) {
        return res.status(400).json({ message: 'Delivery boy ID is required for search' });
      }
      
      const result = await storage.findDeliveryBoyById(req.user.id, deliveryBoyId as string);
      
      if (!result) {
        return res.status(404).json({ message: 'Delivery boy not found' });
      }
      
      res.json({
        user: {
          id: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email,
          phone: result.user.phone,
          role: result.user.role
        },
        alreadyAdded: result.alreadyAdded
      });
    } catch (error) {
      res.status(400).json({ message: 'Failed to search delivery boy' });
    }
  });

  app.get('/api/retailer/delivery-boys/:id', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const deliveryBoy = await storage.getDeliveryBoy(id);
      
      if (!deliveryBoy) {
        return res.status(404).json({ message: 'Delivery boy not found' });
      }
      
      res.json(deliveryBoy);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get delivery boy' });
    }
  });

  // Add delivery boy to retailer
  app.post('/api/retailer/delivery-boys', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { deliveryBoyId, notes } = req.body;
      
      if (!deliveryBoyId) {
        return res.status(400).json({ message: 'Delivery boy ID is required' });
      }
      
      // Check if delivery boy exists and has the right role
      const deliveryBoyUser = await storage.getUserById(deliveryBoyId);
      if (!deliveryBoyUser || deliveryBoyUser.role !== 'DELIVERY_BOY') {
        return res.status(404).json({ message: 'Delivery boy not found' });
      }
      
      // Check if already linked
      const alreadyLinked = await storage.isDeliveryBoyLinkedToRetailer(req.user.id, deliveryBoyId);
      if (alreadyLinked) {
        return res.status(400).json({ message: 'Delivery boy already added to your account' });
      }
      
      // Add the relationship
      const relationship = await storage.addDeliveryBoyToRetailer(req.user.id, deliveryBoyId, req.user.id, notes);
      
      res.status(201).json({ 
        message: 'Delivery boy added successfully',
        deliveryBoy: {
          id: deliveryBoyUser.id,
          fullName: deliveryBoyUser.fullName,
          email: deliveryBoyUser.email,
          phone: deliveryBoyUser.phone,
          linkedAt: relationship.addedAt,
          notes: relationship.notes
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to add delivery boy' });
    }
  });

  // Remove delivery boy from retailer
  app.delete('/api/retailer/delivery-boys/:deliveryBoyId', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { deliveryBoyId } = req.params;
      
      // Check if the relationship exists
      const relationship = await storage.getRetailerDeliveryBoyRelationship(req.user.id, deliveryBoyId);
      if (!relationship) {
        return res.status(404).json({ message: 'Delivery boy not found in your account' });
      }
      
      // Remove the relationship
      await storage.removeDeliveryBoyFromRetailer(req.user.id, deliveryBoyId);
      
      res.json({ message: 'Delivery boy removed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to remove delivery boy' });
    }
  });

  // Public routes - Store discovery
  app.get('/api/stores', async (req, res) => {
    try {
      const { city, pincode, search, name, id } = req.query;
      const stores = await storage.getStores({
        city: city as string,
        pincode: pincode as string,
        search: search as string,
        name: name as string,
        id: id as string
      });
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch stores' });
    }
  });

  // Get popular retailers
  app.get('/api/stores/popular', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const popularStores = await storage.getPopularRetailers(limit);
      res.json(popularStores);
    } catch (error) {
      res.status(400).json({ message: 'Failed to fetch popular retailers' });
    }
  });

  app.get('/api/stores/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const store = await storage.getStoreWithListings(id);
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }
      res.json(store);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch store' });
    }
  });

  // Order routes - Shop Owner
  app.post('/api/orders', authenticateToken, requireRole('SHOP_OWNER'), async (req: any, res) => {
    try {
      const { storeId, items, deliveryType, deliveryAt, note } = req.body;
      
      // Get store and retailer info
      const store = await storage.getStore(storeId);
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }
      
      // Calculate total amount
      let totalAmount = 0;
      const orderItemsData = [];
      
      for (const item of items) {
        const listing = await storage.getListing(item.listingId);
        if (!listing) {
          return res.status(400).json({ message: `Listing ${item.listingId} not found` });
        }
        
        const itemTotal = parseFloat(listing.priceRetail.toString()) * item.qty;
        totalAmount += itemTotal;
        
        orderItemsData.push({
          listingId: item.listingId,
          qty: item.qty,
          priceAt: listing.priceRetail
        });
      }
      
      // Create order
      const orderData = insertOrderSchema.parse({
        ownerId: req.user.id,
        retailerId: store.ownerId,
        storeId,
        totalAmount: totalAmount.toString(),
        deliveryType,
        deliveryAt: deliveryAt ? new Date(deliveryAt) : undefined,
        note
      });
      
      const order = await storage.createOrder(orderData);
      
      // Create order items
      const itemsWithOrderId = orderItemsData.map(item => ({
        ...item,
        orderId: order.id
      }));
      await storage.createOrderItems(itemsWithOrderId);
      
      // Create order event
      await storage.createOrderEvent({
        orderId: order.id,
        type: 'PLACED',
        message: 'Order placed successfully'
      });
      
      // Emit real-time notification
      emitOrderEvent(order.id, req.user.id, store.ownerId, 'orderPlaced', {
        orderId: order.id,
        status: order.status,
        totalAmount: order.totalAmount
      });
      
      res.status(201).json(order);
    } catch (error) {
      console.error('Order creation error:', error);
      res.status(400).json({ message: 'Failed to create order' });
    }
  });

  app.get('/api/orders/mine', authenticateToken, async (req: any, res) => {
    try {
      const orders = await storage.getOrdersByOwner(req.user.id);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.get('/api/orders/:id', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check if user has access to this order
      if (order.ownerId !== req.user.id && order.retailerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch order' });
    }
  });

  // Retailer order management
  app.get('/api/retailer/orders', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const orders = await storage.getOrdersByRetailer(req.user.id);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.post('/api/orders/:id/accept', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { deliveryAt } = req.body;
      
      const order = await storage.getOrder(id);
      if (!order || order.retailerId !== req.user.id) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (order.status !== 'PENDING') {
        return res.status(400).json({ message: 'Order cannot be accepted' });
      }
      
      await storage.updateOrderStatus(id, 'ACCEPTED');
      await storage.createOrderEvent({
        orderId: id,
        type: 'ACCEPTED',
        message: `Order accepted${deliveryAt ? ` with delivery scheduled for ${new Date(deliveryAt).toLocaleDateString()}` : ''}`
      });
      
      emitOrderEvent(id, order.ownerId, order.retailerId, 'orderAccepted', {
        orderId: id,
        status: 'ACCEPTED',
        deliveryAt
      });
      
      res.json({ message: 'Order accepted successfully' });
    } catch (error) {
      res.status(400).json({ message: 'Failed to accept order' });
    }
  });

  app.post('/api/orders/:id/reject', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const order = await storage.getOrder(id);
      if (!order || order.retailerId !== req.user.id) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (order.status !== 'PENDING') {
        return res.status(400).json({ message: 'Order cannot be rejected' });
      }
      
      await storage.updateOrderStatus(id, 'REJECTED');
      await storage.createOrderEvent({
        orderId: id,
        type: 'REJECTED',
        message: `Order rejected: ${reason || 'No reason provided'}`
      });
      
      emitOrderEvent(id, order.ownerId, order.retailerId, 'orderRejected', {
        orderId: id,
        status: 'REJECTED',
        reason
      });
      
      res.json({ message: 'Order rejected successfully' });
    } catch (error) {
      res.status(400).json({ message: 'Failed to reject order' });
    }
  });

  app.post('/api/orders/:id/status', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const order = await storage.getOrder(id);
      if (!order || order.retailerId !== req.user.id) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      const validTransitions: { [key: string]: string[] } = {
        'ACCEPTED': ['READY'],
        'READY': ['OUT_FOR_DELIVERY', 'COMPLETED'],
        'OUT_FOR_DELIVERY': ['COMPLETED']
      };
      
      if (!validTransitions[order.status]?.includes(status)) {
        return res.status(400).json({ message: 'Invalid status transition' });
      }
      
      await storage.updateOrderStatus(id, status);
      await storage.createOrderEvent({
        orderId: id,
        type: status,
        message: `Order status updated to ${status.toLowerCase().replace('_', ' ')}`
      });
      
      emitOrderEvent(id, order.ownerId, order.retailerId, 'orderStatusChanged', {
        orderId: id,
        status,
        previousStatus: order.status
      });
      
      res.json({ message: 'Order status updated successfully' });
    } catch (error) {
      res.status(400).json({ message: 'Failed to update order status' });
    }
  });

  // Assign order to delivery boy
  app.post('/api/orders/:id/assign-delivery-boy', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { deliveryBoyId } = req.body;
      
      const order = await storage.getOrder(id);
      if (!order || order.retailerId !== req.user.id) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Verify delivery boy exists and belongs to retailer
      const deliveryBoy = await storage.getDeliveryBoy(deliveryBoyId);
      if (!deliveryBoy) {
        return res.status(400).json({ message: 'Delivery boy not found' });
      }
      
      // Check if delivery boy is linked to this retailer
      const isLinked = await storage.isDeliveryBoyLinkedToRetailer(req.user.id, deliveryBoyId);
      if (!isLinked) {
        return res.status(400).json({ message: 'Delivery boy not in your team' });
      }

      // Update order with delivery boy assignment
      await storage.assignOrderToDeliveryBoy(id, deliveryBoyId);
      
      await storage.createOrderEvent({
        orderId: id,
        type: 'ASSIGNED_DELIVERY_BOY',
        message: `Order assigned to delivery boy: ${deliveryBoy.fullName}`
      });

      // Create initial khatabook entries for delivery assignment
      const totalAmount = parseFloat(order.totalAmount);
      
      // Create ledger entry for shop owner (debit - they owe money)
      await storage.addLedgerEntry({
        userId: order.ownerId,
        counterpartyId: order.retailerId,
        orderId: id,
        entryType: 'DEBIT',
        transactionType: 'ORDER_DEBIT',
        amount: totalAmount.toString(),
        description: `Order #${id.slice(-8)} - Delivery assigned - Amount due: ₹${totalAmount}`,
        referenceId: id,
        metadata: JSON.stringify({ 
          orderValue: totalAmount,
          deliveryBoy: deliveryBoy.fullName,
          status: 'DELIVERY_ASSIGNED'
        })
      });

      // Create corresponding credit entry for retailer
      await storage.addLedgerEntry({
        userId: order.retailerId,
        counterpartyId: order.ownerId,
        orderId: id,
        entryType: 'CREDIT',
        transactionType: 'ORDER_PLACED',
        amount: totalAmount.toString(),
        description: `Order #${id.slice(-8)} - Delivery assigned - Amount receivable: ₹${totalAmount}`,
        referenceId: id,
        metadata: JSON.stringify({ 
          orderValue: totalAmount,
          deliveryBoy: deliveryBoy.fullName,
          status: 'DELIVERY_ASSIGNED'
        })
      });

      emitOrderEvent(id, order.ownerId, order.retailerId, 'deliveryBoyAssigned', {
        orderId: id,
        deliveryBoy: deliveryBoy.fullName,
        deliveryBoyPhone: deliveryBoy.phone
      });

      res.json({ message: 'Order assigned to delivery boy successfully' });
    } catch (error) {
      res.status(400).json({ message: 'Failed to assign order to delivery boy' });
    }
  });

  app.get('/api/orders/:id/timeline', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check access
      if (order.ownerId !== req.user.id && order.retailerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const timeline = await storage.getOrderEvents(id);
      res.json(timeline);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch order timeline' });
    }
  });

  // Cancel order (Shop Owner)
  app.post('/api/orders/:id/cancel', authenticateToken, requireRole('SHOP_OWNER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);
      
      if (!order || order.ownerId !== req.user.id) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
        return res.status(400).json({ message: 'Order cannot be cancelled' });
      }
      
      await storage.updateOrderStatus(id, 'CANCELLED');
      await storage.createOrderEvent({
        orderId: id,
        type: 'CANCELLED',
        message: 'Order cancelled by customer'
      });
      
      emitOrderEvent(id, order.ownerId, order.retailerId, 'orderCancelled', {
        orderId: id,
        status: 'CANCELLED'
      });
      
      res.json({ message: 'Order cancelled successfully' });
    } catch (error) {
      res.status(400).json({ message: 'Failed to cancel order' });
    }
  });

  // Payment confirmation by delivery boy/retailer
  app.post('/api/orders/:id/payment-received', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { amountReceived, note } = req.body;
      
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (order.retailerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      if (order.paymentReceived) {
        return res.status(400).json({ message: 'Payment already confirmed' });
      }
      
      const totalAmount = parseFloat(order.totalAmount);
      const amount = parseFloat(amountReceived) || totalAmount;
      const remainingBalance = totalAmount - amount;
      const isPartialPayment = remainingBalance > 0;
      
      // Create audit trail entry
      const auditData = {
        orderId: id,
        userId: req.user.id,
        action: 'PAYMENT_RECEIVED',
        oldAmount: "0",
        newAmount: amount.toString(),
        reason: note || (isPartialPayment ? 'Partial payment received' : 'Full payment received'),
        metadata: JSON.stringify({
          totalAmount,
          amountReceived: amount,
          remainingBalance,
          isPartialPayment,
          receivedBy: req.user.fullName
        })
      };
      
      // Record payment using enhanced method
      const updatedOrder = await storage.recordPartialPayment(id, {
        amountReceived: amount.toString(),
        paymentReceivedAt: new Date(),
        paymentReceivedBy: req.user.id
      }, auditData);
      
      // Create order event
      const eventMessage = isPartialPayment 
        ? `Partial payment of ₹${amount} received via Cash on Delivery. Outstanding balance: ₹${remainingBalance.toFixed(2)}`
        : `Full payment of ₹${amount} received via Cash on Delivery`;
        
      await storage.createOrderEvent({
        orderId: id,
        type: 'PAYMENT_RECEIVED',
        message: eventMessage
      });
      
      // Add enhanced ledger entries with counterparty tracking
      await storage.addLedgerEntry({
        userId: order.ownerId,
        counterpartyId: order.retailerId,
        orderId: id,
        entryType: 'DEBIT',
        transactionType: 'ORDER_DEBIT',
        amount: totalAmount.toString(),
        description: `Order placed #${id.slice(-8)} - Total: ₹${totalAmount}`,
        referenceId: id,
        metadata: JSON.stringify({ orderValue: totalAmount })
      });
      
      await storage.addLedgerEntry({
        userId: order.ownerId,
        counterpartyId: order.retailerId,
        orderId: id,
        entryType: 'CREDIT',
        transactionType: 'PAYMENT_CREDIT',
        amount: amount.toString(),
        description: `Payment received for Order #${id.slice(-8)} - Amount: ₹${amount}${isPartialPayment ? ` (Partial)` : ''}`,
        referenceId: id,
        metadata: JSON.stringify({ 
          paymentType: isPartialPayment ? 'partial' : 'full',
          amountReceived: amount,
          remainingBalance 
        })
      });
      
      await storage.addLedgerEntry({
        userId: order.retailerId,
        counterpartyId: order.ownerId,
        orderId: id,
        entryType: 'CREDIT',
        transactionType: 'PAYMENT_CREDIT',
        amount: amount.toString(),
        description: `Payment collected for Order #${id.slice(-8)} - Amount: ₹${amount}${isPartialPayment ? ` (Partial)` : ''}`,
        referenceId: id,
        metadata: JSON.stringify({ 
          paymentType: isPartialPayment ? 'partial' : 'full',
          amountReceived: amount,
          remainingBalance 
        })
      });
      
      // Emit real-time notification
      emitOrderEvent(id, order.ownerId, order.retailerId, 'paymentReceived', {
        orderId: id,
        amountReceived: amount,
        totalAmount,
        remainingBalance,
        isPartialPayment,
        timestamp: new Date()
      });
      
      res.json({ 
        message: `${isPartialPayment ? 'Partial payment' : 'Payment'} confirmation recorded successfully`,
        amountReceived: amount,
        totalAmount,
        remainingBalance,
        isPartialPayment
      });
    } catch (error) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({ message: 'Failed to confirm payment' });
    }
  });

  // Adjust payment amount by shop owner
  app.post('/api/orders/:id/adjust-amount', authenticateToken, requireRole('SHOP_OWNER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { adjustedAmount, adjustmentNote } = req.body;
      
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      if (order.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      if (!order.paymentReceived) {
        return res.status(400).json({ message: 'Payment not yet received' });
      }
      
      const newAmount = parseFloat(adjustedAmount);
      const originalAmount = parseFloat(order.amountReceived || order.totalAmount);
      const adjustment = newAmount - originalAmount;
      
      // Update order with adjusted amount
      await storage.updateOrderPayment(id, {
        amountReceived: newAmount.toString(),
        amountAdjustedBy: req.user.id,
        amountAdjustedAt: new Date(),
        adjustmentNote: adjustmentNote || ''
      });
      
      // Create order event
      await storage.createOrderEvent({
        orderId: id,
        type: 'PAYMENT_ADJUSTED',
        message: `Payment amount adjusted to ₹${newAmount}. ${adjustmentNote || ''}`
      });
      
      if (adjustment !== 0) {
        // Add ledger entries for the adjustment
        const adjustmentType = adjustment > 0 ? 'Additional charge' : 'Discount applied';
        
        await storage.addLedgerEntry({
          userId: order.ownerId,
          orderId: id,
          entryType: adjustment > 0 ? 'DEBIT' : 'CREDIT',
          transactionType: 'PAYMENT_ADJUSTED',
          amount: Math.abs(adjustment).toString(),
          description: `${adjustmentType} for Order #${id.slice(-8)}. ${adjustmentNote || ''}`,
          referenceId: id
        });
        
        await storage.addLedgerEntry({
          userId: order.retailerId,
          orderId: id,
          entryType: adjustment > 0 ? 'CREDIT' : 'DEBIT',
          transactionType: 'PAYMENT_ADJUSTED',
          amount: Math.abs(adjustment).toString(),
          description: `${adjustmentType} for Order #${id.slice(-8)}. ${adjustmentNote || ''}`,
          referenceId: id
        });
      }
      
      // Emit real-time notification
      emitOrderEvent(id, order.ownerId, order.retailerId, 'paymentAdjusted', {
        orderId: id,
        adjustedAmount: newAmount,
        adjustment: adjustment,
        note: adjustmentNote
      });
      
      res.json({ 
        message: 'Payment amount adjusted successfully',
        adjustedAmount: newAmount,
        adjustment: adjustment
      });
    } catch (error) {
      console.error('Amount adjustment error:', error);
      res.status(500).json({ message: 'Failed to adjust payment amount' });
    }
  });

  // Get khatabook/ledger for user
  app.get('/api/khatabook', authenticateToken, async (req: any, res) => {
    try {
      const { page = 1, limit = 20, type } = req.query;
      const ledgerEntries = await storage.getLedgerEntries(req.user.id, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        type: type as string
      });
      res.json(ledgerEntries);
    } catch (error) {
      console.error('Ledger fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch ledger entries' });
    }
  });

  // Get khatabook summary/balance
  app.get('/api/khatabook/summary', authenticateToken, async (req: any, res) => {
    try {
      const { counterpartyId } = req.query;
      const summary = await storage.getLedgerSummary(req.user.id, counterpartyId as string);
      res.json(summary);
    } catch (error) {
      console.error('Ledger summary error:', error);
      res.status(500).json({ message: 'Failed to fetch ledger summary' });
    }
  });

  // Get individual shop owner balances for retailers
  app.get('/api/retailer/shop-owner-balances', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const orders = await storage.getOrdersByRetailer(req.user.id);
      
      // Get unique shop owners from orders
      const shopOwnerIds = Array.from(new Set(orders.map((order: any) => order.ownerId)));
      
      const balances = await Promise.all(
        shopOwnerIds.map(async (shopOwnerId) => {
          const summary = await storage.getLedgerSummary(req.user.id, shopOwnerId);
          const shopOwner = await storage.getUser(shopOwnerId);
          const entries = await storage.getLedgerEntries(req.user.id, { 
            counterpartyId: shopOwnerId,
            limit: 10
          });
          
          return {
            shopOwnerId,
            shopOwnerName: shopOwner?.fullName || 'Unknown',
            shopOwnerEmail: shopOwner?.email,
            currentBalance: summary.currentBalance || 0,
            totalCredits: summary.totalCredits || 0,
            totalDebits: summary.totalDebits || 0,
            recentEntries: entries.entries || []
          };
        })
      );

      // Calculate overall totals
      const totalBalance = balances.reduce((sum, b) => sum + parseFloat(b.currentBalance.toString()), 0);
      const totalCredits = balances.reduce((sum, b) => sum + parseFloat(b.totalCredits.toString()), 0);
      const totalDebits = balances.reduce((sum, b) => sum + parseFloat(b.totalDebits.toString()), 0);

      res.json({
        shopOwnerBalances: balances,
        totals: {
          currentBalance: totalBalance,
          totalCredits: totalCredits,
          totalDebits: totalDebits
        }
      });
    } catch (error) {
      console.error('Shop owner balances error:', error);
      res.status(500).json({ message: 'Failed to fetch shop owner balances' });
    }
  });

  // Get outstanding balance between shop owner and retailer
  app.get('/api/outstanding-balance/:counterpartyId', authenticateToken, async (req: any, res) => {
    try {
      const { counterpartyId } = req.params;
      const balance = await storage.getOutstandingBalance(req.user.id, counterpartyId);
      res.json({ outstandingBalance: balance, counterpartyId });
    } catch (error) {
      console.error('Outstanding balance error:', error);
      res.status(500).json({ message: 'Failed to fetch outstanding balance' });
    }
  });

  // Balance settlement endpoint
  app.post('/api/settle-balances', authenticateToken, requireRole('SHOP_OWNER'), async (req: any, res) => {
    try {
      const { 
        retailerId, 
        currentOrderPayment = 0, 
        outstandingBalancePayment = 0, 
        totalPayment,
        orderId,
        note 
      } = req.body;

      if (!retailerId) {
        return res.status(400).json({ message: 'Retailer ID is required' });
      }

      const actualTotalPayment = totalPayment || (currentOrderPayment + outstandingBalancePayment);

      if (actualTotalPayment <= 0) {
        return res.status(400).json({ message: 'Payment amount must be greater than 0' });
      }

      // Record the settlement
      const settlementResult = await storage.settleBalances(req.user.id, retailerId, {
        currentOrderPayment,
        outstandingBalancePayment,
        totalPayment: actualTotalPayment,
        orderId,
        note
      });

      // Create audit trail for settlement
      await storage.addPaymentAudit({
        orderId: orderId || null,
        userId: req.user.id,
        action: 'BALANCE_SETTLED',
        oldAmount: outstandingBalancePayment > 0 ? (await storage.getOutstandingBalance(req.user.id, retailerId)).toString() : "0",
        newAmount: actualTotalPayment.toString(),
        reason: note || 'Balance settlement',
        metadata: JSON.stringify({
          retailerId,
          currentOrderPayment,
          outstandingBalancePayment,
          totalPayment: actualTotalPayment,
          settlementType: 'manual'
        })
      });

      // If there's a current order payment, update the order
      if (orderId && currentOrderPayment > 0) {
        const order = await storage.getOrder(orderId);
        if (order) {
          await storage.createOrderEvent({
            orderId,
            type: 'PAYMENT_RECEIVED',
            message: `Settlement payment of ₹${currentOrderPayment} applied to order. ${note || ''}`
          });
        }
      }

      res.json({
        message: 'Balance settlement recorded successfully',
        totalSettled: actualTotalPayment,
        currentOrderPayment,
        outstandingBalancePayment,
        remainingBalance: await storage.getOutstandingBalance(req.user.id, retailerId)
      });
    } catch (error) {
      console.error('Balance settlement error:', error);
      res.status(500).json({ message: 'Failed to process balance settlement' });
    }
  });

  // Get payment audit trail for an order
  app.get('/api/orders/:id/audit-trail', authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check access
      if (order.ownerId !== req.user.id && order.retailerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const auditTrail = await storage.getPaymentAuditTrail(id);
      res.json(auditTrail);
    } catch (error) {
      console.error('Audit trail error:', error);
      res.status(500).json({ message: 'Failed to fetch audit trail' });
    }
  });

  // Get catalog for shop owners
  app.get('/api/catalog', async (req, res) => {
    try {
      const { search } = req.query;
      const products = await storage.getProducts({ search: search as string });
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch catalog' });
    }
  });

  // Get popular products based on order history
  app.get('/api/popular-products', async (req, res) => {
    try {
      const { limit = 6 } = req.query;
      const popularProducts = await storage.getPopularProducts(parseInt(limit as string));
      res.json(popularProducts);
    } catch (error) {
      console.error('Popular products error:', error);
      res.status(500).json({ message: 'Failed to fetch popular products' });
    }
  });

  // Seed demo data
  app.post('/api/seed', async (req, res) => {
    try {
      // Create demo users
      const adminPassword = await bcrypt.hash('12345678', 10);
      const retailPassword = await bcrypt.hash('12345678', 10);
      const shopPassword = await bcrypt.hash('12345678', 10);
      
      const admin = await storage.createUser({
        email: 'admin@gmail.com',
        passwordHash: adminPassword,
        role: 'ADMIN',
        fullName: 'Admin User',
        phone: '+91-9876543210'
      });
      
      const retailer = await storage.createUser({
        email: 'retail@gmail.com',
        passwordHash: retailPassword,
        role: 'RETAILER',
        fullName: 'Retailer User',
        phone: '+91-9876543211'
      });
      
      const shopOwner = await storage.createUser({
        email: 'shop@gmail.com',
        passwordHash: shopPassword,
        role: 'SHOP_OWNER',
        fullName: 'Shop Owner',
        phone: '+91-9876543212'
      });
      
      // Create sample store
      const store = await storage.createStore({
        ownerId: retailer.id,
        name: 'Mumbai Electronics Hub',
        description: 'Premium electronics and gadgets',
        address: '123 Commercial Street, Fort',
        city: 'Mumbai',
        pincode: '400001',
        logoUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100',
        isOpen: true,
        rating: '4.6'
      });
      
      // Create sample products
      const products = [
        {
          name: 'Premium Coffee Beans',
          brand: 'Blue Tokai',
          imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400',
          unit: 'kg',
          size: '500g',
          isWholesale: false,
          createdById: admin.id
        },
        {
          name: 'Wireless Earbuds Pro',
          brand: 'Sony',
          imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
          unit: 'piece',
          size: '1 unit',
          isWholesale: true,
          createdById: admin.id
        },
        {
          name: 'Designer Handbag',
          brand: 'Coach',
          imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
          unit: 'piece',
          size: 'Standard',
          isWholesale: false,
          createdById: admin.id
        }
      ];
      
      for (const productData of products) {
        const product = await storage.createProduct(productData);
        
        // Create listing for the retailer store
        await storage.createListing({
          storeId: store.id,
          productId: product.id,
          priceRetail: product.name.includes('Coffee') ? '450' : 
                      product.name.includes('Earbuds') ? '3999' : '12500',
          priceWholesale: product.isWholesale ? 
                         (product.name.includes('Earbuds') ? '3500' : null) : null,
          available: !product.name.includes('Smartphone'), // Make smartphone out of stock
          stockQty: product.name.includes('Coffee') ? 24 :
                   product.name.includes('Earbuds') ? 0 : 8
        });
      }
      
      res.json({ message: 'Demo data seeded successfully' });
    } catch (error) {
      console.error('Seed error:', error);
      res.status(500).json({ message: 'Failed to seed data' });
    }
  });

  // Delivery Boy routes
  app.get('/api/delivery/orders', authenticateToken, requireRole('DELIVERY_BOY'), async (req: any, res) => {
    try {
      // Get orders assigned to this delivery boy
      const orders = await storage.getOrdersForDeliveryBoy(req.user.id);
      res.json(orders);
    } catch (error) {
      console.error('Delivery orders error:', error);
      res.status(500).json({ message: 'Failed to fetch delivery orders' });
    }
  });

  app.get('/api/delivery/orders/:id', authenticateToken, requireRole('DELIVERY_BOY'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrderForDeliveryBoy(id, req.user.id);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found or not assigned to you' });
      }
      
      res.json(order);
    } catch (error) {
      console.error('Delivery order details error:', error);
      res.status(500).json({ message: 'Failed to fetch order details' });
    }
  });

  app.post('/api/delivery/orders/:id/request-payment-change', authenticateToken, requireRole('DELIVERY_BOY'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { newAmount, reason } = req.body;
      
      const order = await storage.getOrderForDeliveryBoy(id, req.user.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found or not assigned to you' });
      }
      
      if (order.status !== 'OUT_FOR_DELIVERY') {
        return res.status(400).json({ message: 'Payment changes only allowed during delivery' });
      }
      
      // Create payment change request
      const changeRequest = await storage.createPaymentChangeRequest({
        orderId: id,
        deliveryBoyId: req.user.id,
        originalAmount: order.totalAmount,
        requestedAmount: newAmount,
        reason,
        status: 'PENDING'
      });
      
      // Notify shop owner via WebSocket
      const shopOwnerClient = clients.get(order.ownerId);
      if (shopOwnerClient && shopOwnerClient.readyState === WebSocket.OPEN) {
        shopOwnerClient.send(JSON.stringify({
          type: 'PAYMENT_CHANGE_REQUEST',
          orderId: id,
          originalAmount: order.totalAmount,
          requestedAmount: newAmount,
          reason,
          requestId: changeRequest.id
        }));
      }
      
      await storage.createOrderEvent({
        orderId: id,
        type: 'PAYMENT_CHANGE_REQUESTED',
        message: `Delivery boy requested payment change from ₹${order.totalAmount} to ₹${newAmount}. Reason: ${reason}`
      });
      
      res.json({ 
        message: 'Payment change request sent to shop owner',
        requestId: changeRequest.id
      });
    } catch (error) {
      console.error('Payment change request error:', error);
      res.status(500).json({ message: 'Failed to create payment change request' });
    }
  });

  app.post('/api/delivery/orders/:id/confirm-payment', authenticateToken, requireRole('DELIVERY_BOY'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { amountReceived, paymentMethod = 'CASH' } = req.body;
      
      const order = await storage.getOrderForDeliveryBoy(id, req.user.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found or not assigned to you' });
      }
      
      if (order.status !== 'OUT_FOR_DELIVERY') {
        return res.status(400).json({ message: 'Can only confirm payment during delivery' });
      }
      
      // Update order with payment information
      await storage.updateOrderPayment(id, {
        paymentReceived: true,
        amountReceived,
        originalAmountReceived: order.totalAmount,
        remainingBalance: (parseFloat(order.totalAmount) - parseFloat(amountReceived)).toString(),
        isPartialPayment: parseFloat(amountReceived) < parseFloat(order.totalAmount),
        paymentReceivedAt: new Date(),
        paymentReceivedBy: req.user.id
      });
      
      // Update order status to completed
      await storage.updateOrderStatus(id, 'COMPLETED');
      
      // Create khatabook entries
      await storage.createKhatabookEntry({
        userId: order.ownerId, // shop owner
        counterpartyId: order.retailerId,
        orderId: id,
        entryType: 'DEBIT',
        transactionType: 'PAYMENT_RECEIVED',
        amount: amountReceived,
        description: `Payment received for order #${id.slice(-8)}`,
        referenceId: id,
        metadata: JSON.stringify({ 
          paymentMethod,
          deliveryBoyId: req.user.id,
          deliveryBoyName: req.user.fullName
        })
      });
      
      await storage.createKhatabookEntry({
        userId: order.retailerId,
        counterpartyId: order.ownerId,
        orderId: id,
        entryType: 'CREDIT',
        transactionType: 'PAYMENT_CREDIT',
        amount: amountReceived,
        description: `Payment received from ${order.owner?.fullName || 'customer'} for order #${id.slice(-8)}`,
        referenceId: id,
        metadata: JSON.stringify({ 
          paymentMethod,
          deliveryBoyId: req.user.id,
          deliveryBoyName: req.user.fullName
        })
      });
      
      // Create order events
      await storage.createOrderEvent({
        orderId: id,
        type: 'PAYMENT_RECEIVED',
        message: `Payment of ₹${amountReceived} received by ${req.user.fullName}`
      });
      
      await storage.createOrderEvent({
        orderId: id,
        type: 'COMPLETED',
        message: `Order completed by delivery boy ${req.user.fullName}`
      });
      
      // Notify both shop owner and retailer
      [order.ownerId, order.retailerId].forEach(userId => {
        const client = clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'ORDER_COMPLETED',
            orderId: id,
            amountReceived,
            paymentMethod,
            deliveryBoy: req.user.fullName
          }));
        }
      });
      
      res.json({ 
        message: 'Payment confirmed and order completed',
        amountReceived,
        remainingBalance: (parseFloat(order.totalAmount) - parseFloat(amountReceived)).toString()
      });
    } catch (error) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({ message: 'Failed to confirm payment' });
    }
  });

  // Delivery boy order status update
  app.post('/api/delivery/orders/:id/status', authenticateToken, requireRole('DELIVERY_BOY'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const order = await storage.getOrderForDeliveryBoy(id, req.user.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found or not assigned to you' });
      }
      
      const validTransitions: { [key: string]: string[] } = {
        'READY': ['OUT_FOR_DELIVERY'],
        'OUT_FOR_DELIVERY': ['COMPLETED']
      };
      
      if (!validTransitions[order.status]?.includes(status)) {
        return res.status(400).json({ message: 'Invalid status transition' });
      }
      
      await storage.updateOrderStatus(id, status);
      await storage.createOrderEvent({
        orderId: id,
        type: status,
        message: `Order status updated to ${status.toLowerCase().replace('_', ' ')} by ${req.user.fullName}`
      });
      
      // Emit real-time notification
      emitOrderEvent(id, order.ownerId, order.retailerId, 'orderStatusChanged', {
        orderId: id,
        status,
        previousStatus: order.status,
        updatedBy: req.user.fullName
      });
      
      res.json({ message: 'Order status updated successfully' });
    } catch (error) {
      console.error('Delivery boy status update error:', error);
      res.status(500).json({ message: 'Failed to update order status' });
    }
  });

  // Shop Owner payment change approval routes
  app.get('/api/shop-owner/payment-change-requests', authenticateToken, requireRole('SHOP_OWNER'), async (req: any, res) => {
    try {
      const requests = await storage.getPaymentChangeRequestsForShopOwner(req.user.id);
      res.json(requests);
    } catch (error) {
      console.error('Payment change requests error:', error);
      res.status(500).json({ message: 'Failed to fetch payment change requests' });
    }
  });

  app.post('/api/shop-owner/payment-change-requests/:id/approve', authenticateToken, requireRole('SHOP_OWNER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getPaymentChangeRequest(id);
      
      if (!request || request.order?.ownerId !== req.user.id) {
        return res.status(404).json({ message: 'Payment change request not found' });
      }
      
      if (request.status !== 'PENDING') {
        return res.status(400).json({ message: 'Request already processed' });
      }
      
      // Update the order amount
      await storage.updateOrderAmount(request.orderId, request.requestedAmount);
      
      // Update request status
      await storage.updatePaymentChangeRequestStatus(id, 'APPROVED');
      
      // Create order event
      await storage.createOrderEvent({
        orderId: request.orderId,
        type: 'PAYMENT_CHANGE_APPROVED',
        message: `Payment change approved by shop owner. New amount: ₹${request.requestedAmount}`
      });

      // Update khatabook entries with the new amount after shop owner approval
      const oldAmount = parseFloat(request.order.totalAmount);
      const newAmount = parseFloat(request.requestedAmount);
      const amountDifference = newAmount - oldAmount;

      if (amountDifference !== 0) {
        const adjustmentType = amountDifference > 0 ? 'increase' : 'decrease';
        const absAmount = Math.abs(amountDifference);

        // Update shop owner's ledger (adjustment to their debt/credit)
        await storage.addLedgerEntry({
          userId: request.order.ownerId,
          counterpartyId: request.order.retailerId,
          orderId: request.orderId,
          entryType: amountDifference > 0 ? 'DEBIT' : 'CREDIT',
          transactionType: 'PAYMENT_ADJUSTED',
          amount: absAmount.toString(),
          description: `Payment ${adjustmentType} approved - Order #${request.orderId.slice(-8)} - Adjustment: ₹${absAmount}`,
          referenceId: request.orderId,
          metadata: JSON.stringify({
            oldAmount,
            newAmount,
            adjustment: amountDifference,
            approvedBy: req.user.fullName,
            requestId: id
          })
        });

        // Update retailer's ledger (opposite adjustment)
        await storage.addLedgerEntry({
          userId: request.order.retailerId,
          counterpartyId: request.order.ownerId,
          orderId: request.orderId,
          entryType: amountDifference > 0 ? 'CREDIT' : 'DEBIT',
          transactionType: 'PAYMENT_ADJUSTED',
          amount: absAmount.toString(),
          description: `Payment ${adjustmentType} approved - Order #${request.orderId.slice(-8)} - Adjustment: ₹${absAmount}`,
          referenceId: request.orderId,
          metadata: JSON.stringify({
            oldAmount,
            newAmount,
            adjustment: amountDifference,
            approvedBy: req.user.fullName,
            requestId: id
          })
        });
      }
      
      // Notify delivery boy
      const deliveryBoyClient = clients.get(request.deliveryBoyId);
      if (deliveryBoyClient && deliveryBoyClient.readyState === WebSocket.OPEN) {
        deliveryBoyClient.send(JSON.stringify({
          type: 'PAYMENT_CHANGE_APPROVED',
          orderId: request.orderId,
          newAmount: request.requestedAmount
        }));
      }
      
      res.json({ message: 'Payment change approved' });
    } catch (error) {
      console.error('Payment change approval error:', error);
      res.status(500).json({ message: 'Failed to approve payment change' });
    }
  });

  app.post('/api/shop-owner/payment-change-requests/:id/reject', authenticateToken, requireRole('SHOP_OWNER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const request = await storage.getPaymentChangeRequest(id);
      
      if (!request || request.order?.ownerId !== req.user.id) {
        return res.status(404).json({ message: 'Payment change request not found' });
      }
      
      if (request.status !== 'PENDING') {
        return res.status(400).json({ message: 'Request already processed' });
      }
      
      // Update request status
      await storage.updatePaymentChangeRequestStatus(id, 'REJECTED');
      
      // Create order event
      await storage.createOrderEvent({
        orderId: request.orderId,
        type: 'PAYMENT_CHANGE_REJECTED',
        message: `Payment change rejected by shop owner. Reason: ${reason || 'No reason provided'}`
      });
      
      // Notify delivery boy
      const deliveryBoyClient = clients.get(request.deliveryBoyId);
      if (deliveryBoyClient && deliveryBoyClient.readyState === WebSocket.OPEN) {
        deliveryBoyClient.send(JSON.stringify({
          type: 'PAYMENT_CHANGE_REJECTED',
          orderId: request.orderId,
          reason: reason || 'No reason provided'
        }));
      }
      
      res.json({ message: 'Payment change rejected' });
    } catch (error) {
      console.error('Payment change rejection error:', error);
      res.status(500).json({ message: 'Failed to reject payment change' });
    }
  });

  // Shop Owner - Get available delivery boys
  app.get('/api/delivery-boys/available', authenticateToken, requireRole('SHOP_OWNER'), async (req: any, res) => {
    try {
      const deliveryBoys = await storage.getAvailableDeliveryBoys();
      res.json(deliveryBoys);
    } catch (error) {
      res.status(400).json({ message: 'Failed to fetch available delivery boys' });
    }
  });


  // Shop Owner - Get retailer-specific balances for khatabook
  app.get('/api/khatabook/retailer-balances', authenticateToken, requireRole('SHOP_OWNER'), async (req: any, res) => {
    try {
      const retailerBalances = await storage.getRetailerBalancesForShopOwner(req.user.id);
      res.json(retailerBalances);
    } catch (error) {
      res.status(400).json({ message: 'Failed to fetch retailer balances' });
    }
  });

  // Delivery Request Management
  // Retailer - Create delivery request
  app.post('/api/delivery-requests', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const validatedData = insertDeliveryRequestSchema.parse({
        ...req.body,
        retailerId: req.user.id
      });
      
      const deliveryRequest = await storage.createDeliveryRequest(validatedData);
      res.status(201).json(deliveryRequest);
    } catch (error) {
      res.status(400).json({ message: 'Failed to create delivery request' });
    }
  });

  // Share delivery request for order - broadcasts to all delivery boys
  app.post('/api/orders/:orderId/share-delivery', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const { estimatedReward, pickupAddress, deliveryAddress } = req.body;
      
      const order = await storage.getOrder(orderId);
      if (!order || order.retailerId !== req.user.id) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Create a shared delivery request
      const deliveryRequest = await storage.createDeliveryRequest({
        retailerId: req.user.id,
        description: `Delivery for order - ${order.owner?.fullName}`,
        title: `Order Delivery - ${order.owner?.fullName}`,
        pickupAddress: pickupAddress || 'Store pickup location',
        deliveryAddress: deliveryAddress || 'Customer delivery location',
        estimatedPayment: estimatedReward || '50',
        orderId: orderId
      });

      // Broadcast to all delivery boys
      broadcastToDeliveryBoys('newDeliveryRequest', {
        requestId: deliveryRequest.id,
        orderId: orderId,
        description: deliveryRequest.description,
        pickupAddress: deliveryRequest.pickupAddress,
        deliveryAddress: deliveryRequest.deliveryAddress,
        estimatedPayment: deliveryRequest.estimatedPayment,
        retailer: req.user.fullName
      });

      res.json({ message: 'Delivery request shared successfully', requestId: deliveryRequest.id });
    } catch (error) {
      console.error('Error sharing delivery request:', error);
      res.status(400).json({ message: 'Failed to share delivery request' });
    }
  });

  // Retailer - Get own delivery requests
  app.get('/api/delivery-requests', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const deliveryRequests = await storage.getDeliveryRequestsByRetailer(req.user.id);
      res.json(deliveryRequests);
    } catch (error) {
      res.status(400).json({ message: 'Failed to fetch delivery requests' });
    }
  });

  // Delivery Boy - Get open delivery requests
  app.get('/api/delivery-requests/open', authenticateToken, requireRole('DELIVERY_BOY'), async (req: any, res) => {
    try {
      const openRequests = await storage.getOpenDeliveryRequests();
      res.json(openRequests);
    } catch (error) {
      res.status(400).json({ message: 'Failed to fetch open delivery requests' });
    }
  });

  // Delivery Boy - Accept delivery request
  app.post('/api/delivery-requests/:id/accept', authenticateToken, requireRole('DELIVERY_BOY'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getDeliveryRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: 'Delivery request not found' });
      }
      
      if (request.status !== 'OPEN') {
        return res.status(400).json({ message: 'Delivery request is no longer available' });
      }

      await storage.acceptDeliveryRequest(id, req.user.id);
      
      // If this delivery request is linked to an order, automatically assign the order
      if (request.orderId) {
        try {
          await storage.assignOrderToDeliveryBoy(request.orderId, req.user.id);
          
          // Create order event for assignment
          await storage.createOrderEvent({
            orderId: request.orderId,
            type: 'ASSIGNED_DELIVERY_BOY',
            message: `Order automatically assigned to delivery boy: ${req.user.fullName} via shared delivery request`
          });

          // Get order details for notification
          const order = await storage.getOrder(request.orderId);
          if (order) {
            emitOrderEvent(request.orderId, order.ownerId, order.retailerId, 'deliveryBoyAssigned', {
              orderId: request.orderId,
              deliveryBoy: req.user.fullName,
              deliveryBoyPhone: req.user.phone || 'Not provided'
            });
          }
        } catch (error) {
          console.error('Failed to assign order to delivery boy:', error);
        }
      }
      
      // Notify retailer about acceptance
      const retailerClient = clients.get(request.retailerId);
      if (retailerClient && retailerClient.readyState === WebSocket.OPEN) {
        retailerClient.send(JSON.stringify({
          type: 'deliveryRequestAccepted',
          payload: { requestId: id, deliveryBoy: req.user.fullName, orderId: request.orderId }
        }));
      }

      res.json({ message: 'Delivery request accepted and order assigned successfully' });
    } catch (error) {
      res.status(400).json({ message: 'Failed to accept delivery request' });
    }
  });

  // Delivery Boy - Reject delivery request
  app.post('/api/delivery-requests/:id/reject', authenticateToken, requireRole('DELIVERY_BOY'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getDeliveryRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: 'Delivery request not found' });
      }
      
      if (request.status !== 'OPEN') {
        return res.status(400).json({ message: 'Delivery request is no longer available' });
      }

      await storage.rejectDeliveryRequest(id);
      res.json({ message: 'Delivery request rejected successfully' });
    } catch (error) {
      res.status(400).json({ message: 'Failed to reject delivery request' });
    }
  });

  // Delivery Boy - Get accepted delivery requests
  app.get('/api/delivery-requests/accepted', authenticateToken, requireRole('DELIVERY_BOY'), async (req: any, res) => {
    try {
      const acceptedRequests = await storage.getAcceptedDeliveryRequestsByDeliveryBoy(req.user.id);
      res.json(acceptedRequests);
    } catch (error) {
      res.status(400).json({ message: 'Failed to fetch accepted delivery requests' });
    }
  });

  // Delivery Boy - Complete delivery request
  app.post('/api/delivery-requests/:id/complete', authenticateToken, requireRole('DELIVERY_BOY'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      const request = await storage.getDeliveryRequest(id);
      if (!request || request.acceptedBy !== req.user.id) {
        return res.status(404).json({ message: 'Delivery request not found or not assigned to you' });
      }

      await storage.completeDeliveryRequest(id, notes);
      
      // Notify retailer about completion
      const retailerClient = clients.get(request.retailerId);
      if (retailerClient && retailerClient.readyState === WebSocket.OPEN) {
        retailerClient.send(JSON.stringify({
          type: 'deliveryRequestCompleted',
          payload: { requestId: id, deliveryBoy: req.user.fullName, notes }
        }));
      }

      res.json({ message: 'Delivery request completed successfully' });
    } catch (error) {
      res.status(400).json({ message: 'Failed to complete delivery request' });
    }
  });

  return httpServer;
}
