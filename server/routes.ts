import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { insertUserSchema, insertStoreSchema, insertProductCatalogSchema, insertListingSchema, insertOrderSchema, insertDeliveryBoySchema } from "@shared/schema";

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
      
      const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
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
      res.status(400).json({ message: 'Invalid listing data' });
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

  // Delivery Boy routes for retailers
  app.post('/api/retailer/delivery-boys', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const deliveryBoyData = insertDeliveryBoySchema.parse({
        ...req.body,
        retailerId: req.user.id
      });

      // Check if delivery boy with same phone number already exists for this retailer
      const existingDeliveryBoy = await storage.getDeliveryBoyByPhone(deliveryBoyData.phone, req.user.id);
      if (existingDeliveryBoy) {
        return res.status(400).json({ 
          message: 'A delivery boy with this phone number already exists' 
        });
      }

      const deliveryBoy = await storage.createDeliveryBoy(deliveryBoyData);
      res.status(201).json(deliveryBoy);
    } catch (error) {
      console.error('Error creating delivery boy:', error);
      res.status(400).json({ message: 'Failed to create delivery boy' });
    }
  });

  app.get('/api/retailer/delivery-boys', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const deliveryBoys = await storage.getDeliveryBoysByRetailer(req.user.id);
      res.json(deliveryBoys);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get delivery boys' });
    }
  });

  app.get('/api/retailer/delivery-boys/:id', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const deliveryBoy = await storage.getDeliveryBoy(id);
      
      if (!deliveryBoy) {
        return res.status(404).json({ message: 'Delivery boy not found' });
      }
      
      // Check if the delivery boy belongs to the current retailer
      if (deliveryBoy.retailerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(deliveryBoy);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get delivery boy' });
    }
  });

  app.put('/api/retailer/delivery-boys/:id', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const deliveryBoy = await storage.getDeliveryBoy(id);
      
      if (!deliveryBoy) {
        return res.status(404).json({ message: 'Delivery boy not found' });
      }
      
      // Check if the delivery boy belongs to the current retailer
      if (deliveryBoy.retailerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const updateData = req.body;
      
      // If phone number is being updated, check for duplicates
      if (updateData.phone && updateData.phone !== deliveryBoy.phone) {
        const existingDeliveryBoy = await storage.getDeliveryBoyByPhone(updateData.phone, req.user.id);
        if (existingDeliveryBoy) {
          return res.status(400).json({ 
            message: 'A delivery boy with this phone number already exists' 
          });
        }
      }
      
      const updatedDeliveryBoy = await storage.updateDeliveryBoy(id, updateData);
      res.json(updatedDeliveryBoy);
    } catch (error) {
      console.error('Error updating delivery boy:', error);
      res.status(400).json({ message: 'Failed to update delivery boy' });
    }
  });

  app.delete('/api/retailer/delivery-boys/:id', authenticateToken, requireRole('RETAILER'), async (req: any, res) => {
    try {
      const { id } = req.params;
      const deliveryBoy = await storage.getDeliveryBoy(id);
      
      if (!deliveryBoy) {
        return res.status(404).json({ message: 'Delivery boy not found' });
      }
      
      // Check if the delivery boy belongs to the current retailer
      if (deliveryBoy.retailerId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      await storage.deleteDeliveryBoy(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete delivery boy' });
    }
  });

  // Public routes - Store discovery
  app.get('/api/stores', async (req, res) => {
    try {
      const { city, pincode, search } = req.query;
      const stores = await storage.getStores({
        city: city as string,
        pincode: pincode as string,
        search: search as string
      });
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch stores' });
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

      // Verify delivery boy belongs to retailer
      const deliveryBoy = await storage.getDeliveryBoy(deliveryBoyId);
      if (!deliveryBoy || deliveryBoy.retailerId !== req.user.id) {
        return res.status(400).json({ message: 'Invalid delivery boy' });
      }

      // Update order with delivery boy assignment
      await storage.assignOrderToDeliveryBoy(id, deliveryBoyId);
      
      await storage.createOrderEvent({
        orderId: id,
        type: 'ASSIGNED_DELIVERY_BOY',
        message: `Order assigned to delivery boy: ${deliveryBoy.name}`
      });

      emitOrderEvent(id, order.ownerId, order.retailerId, 'deliveryBoyAssigned', {
        orderId: id,
        deliveryBoy: deliveryBoy.name,
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
      const { data: orders } = await storage.getOrdersByRetailer(req.user.id);
      
      // Get unique shop owners from orders
      const shopOwnerIds = [...new Set(orders.map(order => order.ownerId))];
      
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

  return httpServer;
}
