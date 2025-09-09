import { 
  users, stores, productCatalog, listings, orders, orderItems, orderEvents, fcmTokens, khatabook, paymentAuditTrail, deliveryRequests, paymentChangeRequests, retailerDeliveryBoys,
  type User, type InsertUser, type Store, type InsertStore,
  type ProductCatalog, type InsertProductCatalog, type Listing, type InsertListing,
  type Order, type InsertOrder, type OrderItem, type InsertOrderItem,
  type OrderEvent, type InsertOrderEvent, type FcmToken, type InsertFcmToken,
  type Khatabook, type InsertKhatabook, type PaymentAuditTrail, type InsertPaymentAuditTrail,
  type DeliveryRequest, type InsertDeliveryRequest,
  type PaymentChangeRequest, type InsertPaymentChangeRequest,
  type RetailerDeliveryBoy, type InsertRetailerDeliveryBoy
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  
  // Store operations
  getStore(id: string): Promise<Store | undefined>;
  getStoreByOwnerId(ownerId: string): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: string, store: Partial<InsertStore>): Promise<Store>;
  getStores(filters?: { city?: string; pincode?: string; search?: string; name?: string; id?: string }): Promise<any[]>;
  getStoreWithListings(storeId: string): Promise<any>;
  
  // Product catalog operations
  createProduct(product: InsertProductCatalog): Promise<ProductCatalog>;
  getProducts(filters?: { search?: string; page?: number; limit?: number }): Promise<ProductCatalog[]>;
  getProduct(id: string): Promise<ProductCatalog | undefined>;
  updateProduct(id: string, product: Partial<InsertProductCatalog>): Promise<ProductCatalog>;
  deleteProduct(id: string): Promise<void>;
  
  // Listing operations
  createListing(listing: InsertListing): Promise<Listing>;
  getListingsByStore(storeId: string, filters?: { available?: boolean; search?: string }): Promise<any[]>;
  getListing(id: string): Promise<Listing | undefined>;
  updateListing(id: string, listing: Partial<InsertListing>): Promise<Listing>;
  
  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrdersByOwner(ownerId: string): Promise<any[]>;
  getOrdersByRetailer(retailerId: string): Promise<any[]>;
  getOrder(id: string): Promise<any>;
  updateOrderStatus(id: string, status: string): Promise<Order>;
  assignOrderToDeliveryBoy(orderId: string, deliveryBoyId: string): Promise<Order>;
  
  // Order items
  createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]>;
  getOrderItems(orderId: string): Promise<any[]>;
  
  // Order events
  createOrderEvent(event: InsertOrderEvent): Promise<OrderEvent>;
  getOrderEvents(orderId: string): Promise<OrderEvent[]>;
  
  // FCM tokens
  saveFcmToken(token: InsertFcmToken): Promise<FcmToken>;
  getFcmTokensByUser(userId: string): Promise<FcmToken[]>;
  
  // Popular products based on order history
  getPopularProducts(limit?: number): Promise<any[]>;
  
  // Payment confirmation operations
  updateOrderPayment(orderId: string, paymentData: any): Promise<Order>;
  
  // Ledger/Khatabook operations
  addLedgerEntry(entry: InsertKhatabook): Promise<Khatabook>;
  getLedgerEntries(userId: string, options?: { page?: number; limit?: number; type?: string; counterpartyId?: string }): Promise<any>;
  getLedgerSummary(userId: string, counterpartyId?: string): Promise<any>;
  getOutstandingBalance(shopOwnerId: string, retailerId: string): Promise<number>;
  
  // Enhanced payment operations
  recordPartialPayment(orderId: string, paymentData: any, auditData: InsertPaymentAuditTrail): Promise<Order>;
  settleBalances(shopOwnerId: string, retailerId: string, settlementData: any): Promise<any>;
  
  // Audit trail operations
  addPaymentAudit(auditData: InsertPaymentAuditTrail): Promise<PaymentAuditTrail>;
  getPaymentAuditTrail(orderId: string): Promise<PaymentAuditTrail[]>;
  
  // Delivery boy operations
  createDeliveryBoy(deliveryBoy: InsertDeliveryBoy): Promise<DeliveryBoy>;
  getDeliveryBoysByRetailer(retailerId: string): Promise<DeliveryBoy[]>;
  getDeliveryBoy(id: string): Promise<DeliveryBoy | undefined>;
  getDeliveryBoyByPhone(phone: string, retailerId?: string): Promise<DeliveryBoy | undefined>;
  updateDeliveryBoy(id: string, deliveryBoy: Partial<InsertDeliveryBoy>): Promise<DeliveryBoy>;
  deleteDeliveryBoy(id: string): Promise<void>;
  searchDeliveryBoysByLocation(retailerId: string, locations: { pickupLocation?: string; deliveryLocation?: string }): Promise<DeliveryBoy[]>;
  
  // Delivery boy order management
  getOrdersForDeliveryBoy(deliveryBoyUserId: string): Promise<any[]>;
  getOrderForDeliveryBoy(orderId: string, deliveryBoyUserId: string): Promise<any>;
  
  // Payment change requests
  createPaymentChangeRequest(request: InsertPaymentChangeRequest): Promise<PaymentChangeRequest>;
  getPaymentChangeRequest(id: string): Promise<any>;
  getPaymentChangeRequestsForShopOwner(shopOwnerId: string): Promise<any[]>;
  updatePaymentChangeRequestStatus(id: string, status: string): Promise<PaymentChangeRequest>;
  
  // Order amount updates
  updateOrderAmount(orderId: string, newAmount: string): Promise<Order>;
  
  // Khatabook operations
  createKhatabookEntry(entry: InsertKhatabook): Promise<Khatabook>;
  
  // Admin overview operations
  getAllUsers(): Promise<User[]>;
  getAllOrdersForAdmin(): Promise<any[]>;
  getSystemAnalytics(): Promise<any>;

  // Delivery request operations
  createDeliveryRequest(request: InsertDeliveryRequest): Promise<DeliveryRequest>;
  getDeliveryRequest(id: string): Promise<DeliveryRequest | undefined>;
  getDeliveryRequestsByRetailer(retailerId: string): Promise<DeliveryRequest[]>;
  getOpenDeliveryRequests(): Promise<DeliveryRequest[]>;
  getAcceptedDeliveryRequestsByDeliveryBoy(deliveryBoyId: string): Promise<DeliveryRequest[]>;
  acceptDeliveryRequest(id: string, deliveryBoyId: string): Promise<DeliveryRequest>;
  rejectDeliveryRequest(id: string): Promise<DeliveryRequest>;
  completeDeliveryRequest(id: string, notes?: string): Promise<DeliveryRequest>;

  // Retailer-Delivery Boy relationship operations
  addDeliveryBoyToRetailer(retailerId: string, deliveryBoyId: string, addedBy: string, notes?: string): Promise<RetailerDeliveryBoy>;
  removeDeliveryBoyFromRetailer(retailerId: string, deliveryBoyId: string): Promise<void>;
  isDeliveryBoyLinkedToRetailer(retailerId: string, deliveryBoyId: string): Promise<boolean>;
  getLinkedDeliveryBoys(retailerId: string): Promise<any[]>;
  getLinkedRetailers(deliveryBoyId: string): Promise<any[]>;
  getRetailerDeliveryBoyRelationship(retailerId: string, deliveryBoyId: string): Promise<RetailerDeliveryBoy | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Generate custom ID based on role
    const idResult = await db.execute(sql`SELECT generate_user_id(${insertUser.role}) as id`);
    const customId = (idResult.rows[0] as any).id;
    
    const [user] = await db.insert(users).values({
      ...insertUser,
      id: customId
    }).returning();
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return user;
  }

  async getStore(id: string): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store || undefined;
  }

  async getStoreByOwnerId(ownerId: string): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.ownerId, ownerId));
    return store || undefined;
  }

  async createStore(insertStore: InsertStore): Promise<Store> {
    const [store] = await db.insert(stores).values(insertStore).returning();
    return store;
  }

  async updateStore(id: string, updateStore: Partial<InsertStore>): Promise<Store> {
    const [store] = await db.update(stores).set({ ...updateStore, updatedAt: new Date() }).where(eq(stores.id, id)).returning();
    return store;
  }

  async getStores(filters?: { city?: string; pincode?: string; search?: string; name?: string; id?: string }): Promise<any[]> {
    const query = db.select({
      id: stores.id,
      ownerId: stores.ownerId,
      name: stores.name,
      description: stores.description,
      address: stores.address,
      city: stores.city,
      pincode: stores.pincode,
      logoUrl: stores.logoUrl,
      isOpen: stores.isOpen,
      rating: stores.rating,
      createdAt: stores.createdAt,
      updatedAt: stores.updatedAt,
      // Include retailer information
      retailerName: users.fullName,
      retailerEmail: users.email,
      retailerPhone: users.phone
    })
    .from(stores)
    .leftJoin(users, eq(stores.ownerId, users.id));
    
    const conditions = [];
    if (filters?.city) {
      conditions.push(eq(stores.city, filters.city));
    }
    if (filters?.pincode) {
      conditions.push(eq(stores.pincode, filters.pincode));
    }
    if (filters?.search) {
      conditions.push(like(stores.name, `%${filters.search}%`));
    }
    if (filters?.name) {
      conditions.push(like(stores.name, `%${filters.name}%`));
    }
    if (filters?.id) {
      conditions.push(eq(stores.id, filters.id));
    }
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    
    return await query;
  }

  async getStoreWithListings(storeId: string): Promise<any> {
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
      with: {
        owner: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        listings: {
          with: {
            product: true
          },
          where: eq(listings.available, true)
        }
      }
    });
    return store;
  }

  async createProduct(insertProduct: InsertProductCatalog): Promise<ProductCatalog> {
    const [product] = await db.insert(productCatalog).values(insertProduct).returning();
    return product;
  }

  async getProducts(filters?: { search?: string; page?: number; limit?: number }): Promise<ProductCatalog[]> {
    let query = db.select().from(productCatalog);
    
    if (filters?.search) {
      query = query.where(or(
        like(productCatalog.name, `%${filters.search}%`),
        like(productCatalog.brand, `%${filters.search}%`)
      ));
    }
    
    return await query.orderBy(desc(productCatalog.createdAt));
  }

  async getProduct(id: string): Promise<ProductCatalog | undefined> {
    const [product] = await db.select().from(productCatalog).where(eq(productCatalog.id, id));
    return product || undefined;
  }

  async updateProduct(id: string, updateProduct: Partial<InsertProductCatalog>): Promise<ProductCatalog> {
    const [product] = await db.update(productCatalog).set({ ...updateProduct, updatedAt: new Date() }).where(eq(productCatalog.id, id)).returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(productCatalog).where(eq(productCatalog.id, id));
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    const [listing] = await db.insert(listings).values(insertListing).returning();
    return listing;
  }

  async getListingsByStore(storeId: string, filters?: { available?: boolean; search?: string }): Promise<any[]> {
    const query = db.query.listings.findMany({
      where: and(
        eq(listings.storeId, storeId),
        filters?.available !== undefined ? eq(listings.available, filters.available) : undefined
      ),
      with: {
        product: true
      }
    });
    
    return await query;
  }

  async getListing(id: string): Promise<Listing | undefined> {
    const [listing] = await db.select().from(listings).where(eq(listings.id, id));
    return listing || undefined;
  }

  async updateListing(id: string, updateListing: Partial<InsertListing>): Promise<Listing> {
    const [listing] = await db.update(listings).set({ ...updateListing, updatedAt: new Date() }).where(eq(listings.id, id)).returning();
    return listing;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async getOrdersByOwner(ownerId: string): Promise<any[]> {
    return await db.query.orders.findMany({
      where: eq(orders.ownerId, ownerId),
      with: {
        store: true,
        retailer: true,
        items: {
          with: {
            listing: {
              with: {
                product: true
              }
            }
          }
        },
        timeline: true
      },
      orderBy: desc(orders.createdAt)
    });
  }

  async getOrdersByRetailer(retailerId: string): Promise<any[]> {
    return await db.query.orders.findMany({
      where: eq(orders.retailerId, retailerId),
      with: {
        owner: true,
        store: true,
        items: {
          with: {
            listing: {
              with: {
                product: true
              }
            }
          }
        },
        timeline: true
      },
      orderBy: desc(orders.createdAt)
    });
  }

  async getOrder(id: string): Promise<any> {
    return await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        owner: true,
        retailer: true,
        store: true,
        items: {
          with: {
            listing: {
              with: {
                product: true
              }
            }
          }
        },
        timeline: {
          orderBy: asc(orderEvents.createdAt)
        }
      }
    });
  }

  async updateOrder(id: string, updateData: Partial<InsertOrder>): Promise<Order> {
    const [order] = await db.update(orders).set({ ...updateData, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const [order] = await db.update(orders).set({ status: status as any, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    return order;
  }

  async assignOrderToDeliveryBoy(orderId: string, deliveryBoyId: string): Promise<Order> {
    const [order] = await db.update(orders).set({ 
      assignedDeliveryBoyId: deliveryBoyId, 
      updatedAt: new Date() 
    }).where(eq(orders.id, orderId)).returning();
    return order;
  }

  async createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]> {
    return await db.insert(orderItems).values(items).returning();
  }

  async getOrderItems(orderId: string): Promise<any[]> {
    return await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
      with: {
        listing: {
          with: {
            product: true
          }
        }
      }
    });
  }

  async createOrderEvent(insertEvent: InsertOrderEvent): Promise<OrderEvent> {
    const [event] = await db.insert(orderEvents).values(insertEvent).returning();
    return event;
  }

  async getOrderEvents(orderId: string): Promise<OrderEvent[]> {
    return await db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId)).orderBy(asc(orderEvents.createdAt));
  }

  async saveFcmToken(insertToken: InsertFcmToken): Promise<FcmToken> {
    const [token] = await db.insert(fcmTokens).values(insertToken).returning();
    return token;
  }

  async getFcmTokensByUser(userId: string): Promise<FcmToken[]> {
    return await db.select().from(fcmTokens).where(eq(fcmTokens.userId, userId));
  }

  async getPopularProducts(limit: number = 6): Promise<any[]> {
    // Get products with order frequency from completed orders
    const popularProducts = await db
      .select({
        product: productCatalog,
        totalOrdered: sql<number>`sum(${orderItems.qty})`.as('total_ordered'),
        orderCount: sql<number>`count(distinct ${orders.id})`.as('order_count'),
        avgPrice: sql<number>`avg(${orderItems.priceAt})`.as('avg_price')
      })
      .from(orderItems)
      .innerJoin(listings, eq(orderItems.listingId, listings.id))
      .innerJoin(productCatalog, eq(listings.productId, productCatalog.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orders.status, 'COMPLETED'))
      .groupBy(productCatalog.id, productCatalog.name, productCatalog.brand, productCatalog.imageUrl, productCatalog.unit, productCatalog.size, productCatalog.isWholesale, productCatalog.createdById, productCatalog.createdAt, productCatalog.updatedAt)
      .orderBy(sql`sum(${orderItems.qty}) DESC`)
      .limit(limit);

    // If no orders exist, return random products from catalog
    if (popularProducts.length === 0) {
      const randomProducts = await db
        .select({
          product: productCatalog,
          totalOrdered: sql<number>`0`.as('total_ordered'),
          orderCount: sql<number>`0`.as('order_count'),
          avgPrice: sql<number>`0`.as('avg_price')
        })
        .from(productCatalog)
        .orderBy(sql`RANDOM()`)
        .limit(limit);
      
      return randomProducts;
    }

    return popularProducts;
  }

  async updateOrderPayment(orderId: string, paymentData: any): Promise<Order> {
    const [order] = await db.update(orders)
      .set({
        paymentReceived: paymentData.paymentReceived,
        amountReceived: paymentData.amountReceived,
        originalAmountReceived: paymentData.originalAmountReceived,
        paymentReceivedAt: paymentData.paymentReceivedAt,
        paymentReceivedBy: paymentData.paymentReceivedBy,
        amountAdjustedBy: paymentData.amountAdjustedBy,
        amountAdjustedAt: paymentData.amountAdjustedAt,
        adjustmentNote: paymentData.adjustmentNote,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async addLedgerEntry(entry: InsertKhatabook): Promise<Khatabook> {
    // Calculate running balance for the user (considering counterparty if provided)
    let balanceQuery = db.select({ balance: khatabook.balance })
      .from(khatabook)
      .where(eq(khatabook.userId, entry.userId));
    
    if (entry.counterpartyId) {
      const counterpartyConditions = [
        eq(khatabook.userId, entry.userId),
        eq(khatabook.counterpartyId, entry.counterpartyId)
      ];
      balanceQuery = db.select({ balance: khatabook.balance })
        .from(khatabook)
        .where(and(...counterpartyConditions));
    }
    
    const lastEntry = await balanceQuery
      .orderBy(desc(khatabook.createdAt))
      .limit(1);
    
    const lastBalance = lastEntry[0]?.balance || "0";
    const lastBalanceNum = parseFloat(lastBalance);
    const entryAmount = parseFloat(entry.amount);
    
    let newBalance = lastBalanceNum;
    if (entry.entryType === 'CREDIT') {
      newBalance += entryAmount;
    } else {
      newBalance -= entryAmount;
    }
    
    const [ledgerEntry] = await db.insert(khatabook).values({
      ...entry,
      balance: newBalance.toString()
    }).returning();
    return ledgerEntry;
  }

  async getLedgerEntries(userId: string, options: { page?: number; limit?: number; type?: string; counterpartyId?: string } = {}): Promise<any> {
    const { page = 1, limit = 20, type, counterpartyId } = options;
    const offset = (page - 1) * limit;
    
    let whereConditions = [eq(khatabook.userId, userId)];
    
    if (type) {
      whereConditions.push(eq(khatabook.entryType, type as any));
    }
    
    if (counterpartyId) {
      whereConditions.push(eq(khatabook.counterpartyId, counterpartyId));
    }
    
    let query = db.select({
      id: khatabook.id,
      entryType: khatabook.entryType,
      transactionType: khatabook.transactionType,
      amount: khatabook.amount,
      balance: khatabook.balance,
      description: khatabook.description,
      referenceId: khatabook.referenceId,
      counterpartyId: khatabook.counterpartyId,
      metadata: khatabook.metadata,
      createdAt: khatabook.createdAt,
      orderId: khatabook.orderId
    })
    .from(khatabook)
    .where(and(...whereConditions));
    
    const entries = await query
      .orderBy(desc(khatabook.createdAt))
      .limit(limit)
      .offset(offset);
    
    const total = await db.select({ count: sql<number>`count(*)` })
      .from(khatabook)
      .where(and(...whereConditions));
    
    return {
      entries,
      pagination: {
        page,
        limit,
        total: total[0].count,
        totalPages: Math.ceil(total[0].count / limit)
      }
    };
  }


  async getLedgerSummary(userId: string, counterpartyId?: string): Promise<any> {
    let whereConditions = [eq(khatabook.userId, userId)];
    
    if (counterpartyId) {
      whereConditions.push(eq(khatabook.counterpartyId, counterpartyId));
    }
    
    const lastEntry = await db.select({ balance: khatabook.balance })
      .from(khatabook)
      .where(and(...whereConditions))
      .orderBy(desc(khatabook.createdAt))
      .limit(1);
    
    const currentBalance = lastEntry[0]?.balance || "0";
    
    // Get summary statistics
    const stats = await db.select({
      totalCredits: sql<number>`COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0)`,
      totalDebits: sql<number>`COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0)`,
      totalTransactions: sql<number>`COUNT(*)`
    })
    .from(khatabook)
    .where(and(...whereConditions));
    
    // Get recent transactions
    const recentTransactions = await db.select({
      id: khatabook.id,
      entryType: khatabook.entryType,
      transactionType: khatabook.transactionType,
      amount: khatabook.amount,
      description: khatabook.description,
      counterpartyId: khatabook.counterpartyId,
      createdAt: khatabook.createdAt
    })
    .from(khatabook)
    .where(and(...whereConditions))
    .orderBy(desc(khatabook.createdAt))
    .limit(5);
    
    return {
      currentBalance: parseFloat(currentBalance),
      totalCredits: stats[0].totalCredits,
      totalDebits: stats[0].totalDebits,
      totalTransactions: stats[0].totalTransactions,
      recentTransactions
    };
  }

  async getOutstandingBalance(shopOwnerId: string, retailerId: string): Promise<number> {
    const lastEntry = await db.select({ balance: khatabook.balance })
      .from(khatabook)
      .where(and(
        eq(khatabook.userId, shopOwnerId),
        eq(khatabook.counterpartyId, retailerId)
      ))
      .orderBy(desc(khatabook.createdAt))
      .limit(1);
    
    const balance = lastEntry[0]?.balance || "0";
    return parseFloat(balance);
  }

  async recordPartialPayment(orderId: string, paymentData: any, auditData: InsertPaymentAuditTrail): Promise<Order> {
    // Get the order first to calculate remaining balance
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    const totalAmount = parseFloat(order.totalAmount);
    const amountReceived = parseFloat(paymentData.amountReceived);
    const remainingBalance = totalAmount - amountReceived;
    
    // Update order with partial payment information
    const [updatedOrder] = await db.update(orders)
      .set({
        paymentReceived: true,
        amountReceived: paymentData.amountReceived,
        originalAmountReceived: paymentData.amountReceived,
        remainingBalance: remainingBalance.toString(),
        isPartialPayment: remainingBalance > 0,
        paymentReceivedAt: paymentData.paymentReceivedAt,
        paymentReceivedBy: paymentData.paymentReceivedBy,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();
    
    // Add audit trail
    await this.addPaymentAudit(auditData);
    
    return updatedOrder;
  }

  async settleBalances(shopOwnerId: string, retailerId: string, settlementData: any): Promise<any> {
    const { currentOrderPayment, outstandingBalancePayment, totalPayment, orderId, note } = settlementData;
    
    // Create ledger entries for the settlement
    const entries = [];
    
    if (currentOrderPayment > 0) {
      // Payment for current order
      entries.push(await this.addLedgerEntry({
        userId: shopOwnerId,
        counterpartyId: retailerId,
        orderId: orderId,
        entryType: 'DEBIT',
        transactionType: 'PAYMENT_CREDIT',
        amount: currentOrderPayment.toString(),
        description: `Payment for current order #${orderId?.slice(-8)}`,
        referenceId: orderId,
        metadata: JSON.stringify({ settlementType: 'current_order' })
      }));
      
      entries.push(await this.addLedgerEntry({
        userId: retailerId,
        counterpartyId: shopOwnerId,
        orderId: orderId,
        entryType: 'CREDIT',
        transactionType: 'PAYMENT_CREDIT',
        amount: currentOrderPayment.toString(),
        description: `Payment received for order #${orderId?.slice(-8)}`,
        referenceId: orderId,
        metadata: JSON.stringify({ settlementType: 'current_order' })
      }));
    }
    
    if (outstandingBalancePayment > 0) {
      // Payment for outstanding balance
      entries.push(await this.addLedgerEntry({
        userId: shopOwnerId,
        counterpartyId: retailerId,
        entryType: 'DEBIT',
        transactionType: 'BALANCE_CLEAR_CREDIT',
        amount: outstandingBalancePayment.toString(),
        description: `Settlement of outstanding balance. ${note || ''}`,
        referenceId: `SETTLEMENT-${Date.now()}`,
        metadata: JSON.stringify({ settlementType: 'outstanding_balance', note })
      }));
      
      entries.push(await this.addLedgerEntry({
        userId: retailerId,
        counterpartyId: shopOwnerId,
        entryType: 'CREDIT',
        transactionType: 'BALANCE_CLEAR_CREDIT',
        amount: outstandingBalancePayment.toString(),
        description: `Outstanding balance settlement received. ${note || ''}`,
        referenceId: `SETTLEMENT-${Date.now()}`,
        metadata: JSON.stringify({ settlementType: 'outstanding_balance', note })
      }));
    }
    
    return { entries, totalSettled: totalPayment };
  }

  async addPaymentAudit(auditData: InsertPaymentAuditTrail): Promise<PaymentAuditTrail> {
    const [audit] = await db.insert(paymentAuditTrail).values(auditData).returning();
    return audit;
  }

  async getPaymentAuditTrail(orderId: string): Promise<PaymentAuditTrail[]> {
    return await db.select().from(paymentAuditTrail)
      .where(eq(paymentAuditTrail.orderId, orderId))
      .orderBy(desc(paymentAuditTrail.createdAt));
  }

  async getDeliveryBoysByRetailer(retailerId: string): Promise<User[]> {
    // Return all delivery boy users - since delivery boys are now just users with DELIVERY_BOY role
    return await db.select().from(users)
      .where(eq(users.role, 'DELIVERY_BOY'))
      .orderBy(desc(users.createdAt));
  }

  async getDeliveryBoy(id: string): Promise<User | undefined> {
    // Get delivery boy user by ID
    const [deliveryBoy] = await db.select().from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.role, 'DELIVERY_BOY')
        )
      );
    return deliveryBoy || undefined;
  }

  async getDeliveryBoyByPhone(phone: string): Promise<User | undefined> {
    // Get delivery boy user by phone
    const [deliveryBoy] = await db.select().from(users)
      .where(
        and(
          eq(users.phone, phone),
          eq(users.role, 'DELIVERY_BOY')
        )
      );
    return deliveryBoy || undefined;
  }

  async findDeliveryBoyById(retailerId: string, deliveryBoyId: string): Promise<{ user: User; alreadyAdded: boolean } | undefined> {
    // Search for delivery boy user directly by ID
    const [deliveryBoyUser] = await db.select().from(users)
      .where(
        and(
          eq(users.id, deliveryBoyId),
          eq(users.role, 'DELIVERY_BOY')
        )
      );
    
    if (!deliveryBoyUser) {
      return undefined;
    }
    
    // Check if this delivery boy is already linked to the retailer
    const alreadyAdded = await this.isDeliveryBoyLinkedToRetailer(retailerId, deliveryBoyId);
    
    return {
      user: deliveryBoyUser,
      alreadyAdded
    };
  }

  // Retailer-Delivery Boy relationship operations
  async addDeliveryBoyToRetailer(retailerId: string, deliveryBoyId: string, addedBy: string, notes?: string): Promise<RetailerDeliveryBoy> {
    const [relationship] = await db.insert(retailerDeliveryBoys).values({
      retailerId,
      deliveryBoyId,
      addedBy,
      notes,
      status: 'ACTIVE'
    }).returning();
    return relationship;
  }

  async removeDeliveryBoyFromRetailer(retailerId: string, deliveryBoyId: string): Promise<void> {
    await db.delete(retailerDeliveryBoys)
      .where(
        and(
          eq(retailerDeliveryBoys.retailerId, retailerId),
          eq(retailerDeliveryBoys.deliveryBoyId, deliveryBoyId)
        )
      );
  }

  async isDeliveryBoyLinkedToRetailer(retailerId: string, deliveryBoyId: string): Promise<boolean> {
    const [relationship] = await db.select().from(retailerDeliveryBoys)
      .where(
        and(
          eq(retailerDeliveryBoys.retailerId, retailerId),
          eq(retailerDeliveryBoys.deliveryBoyId, deliveryBoyId),
          eq(retailerDeliveryBoys.status, 'ACTIVE')
        )
      );
    return !!relationship;
  }

  async getLinkedDeliveryBoys(retailerId: string): Promise<any[]> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
        linkedAt: retailerDeliveryBoys.addedAt,
        notes: retailerDeliveryBoys.notes,
        relationshipId: retailerDeliveryBoys.id
      })
      .from(retailerDeliveryBoys)
      .innerJoin(users, eq(retailerDeliveryBoys.deliveryBoyId, users.id))
      .where(
        and(
          eq(retailerDeliveryBoys.retailerId, retailerId),
          eq(retailerDeliveryBoys.status, 'ACTIVE')
        )
      )
      .orderBy(desc(retailerDeliveryBoys.addedAt));
    
    return result;
  }

  async getLinkedRetailers(deliveryBoyId: string): Promise<any[]> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
        linkedAt: retailerDeliveryBoys.addedAt,
        notes: retailerDeliveryBoys.notes,
        relationshipId: retailerDeliveryBoys.id
      })
      .from(retailerDeliveryBoys)
      .innerJoin(users, eq(retailerDeliveryBoys.retailerId, users.id))
      .where(
        and(
          eq(retailerDeliveryBoys.deliveryBoyId, deliveryBoyId),
          eq(retailerDeliveryBoys.status, 'ACTIVE')
        )
      )
      .orderBy(desc(retailerDeliveryBoys.addedAt));
    
    return result;
  }

  async getRetailerDeliveryBoyRelationship(retailerId: string, deliveryBoyId: string): Promise<RetailerDeliveryBoy | undefined> {
    const [relationship] = await db.select().from(retailerDeliveryBoys)
      .where(
        and(
          eq(retailerDeliveryBoys.retailerId, retailerId),
          eq(retailerDeliveryBoys.deliveryBoyId, deliveryBoyId)
        )
      );
    return relationship || undefined;
  }



  // Delivery boy order management
  async getOrdersForDeliveryBoy(deliveryBoyUserId: string): Promise<any[]> {
    const result = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        deliveryType: orders.deliveryType,
        deliveryAt: orders.deliveryAt,
        note: orders.note,
        createdAt: orders.createdAt,
        store: {
          id: stores.id,
          name: stores.name,
          address: stores.address,
          city: stores.city,
          pincode: stores.pincode,
        },
        owner: {
          id: users.id,
          fullName: users.fullName,
          phone: users.phone,
        }
      })
      .from(orders)
      .innerJoin(stores, eq(orders.storeId, stores.id))
      .innerJoin(users, eq(orders.ownerId, users.id))
      .where(
        and(
          eq(orders.assignedDeliveryBoyId, deliveryBoyUserId),
          or(
            eq(orders.status, 'ACCEPTED'),
            eq(orders.status, 'READY'),
            eq(orders.status, 'OUT_FOR_DELIVERY')
          )
        )
      )
      .orderBy(desc(orders.createdAt));
    
    // For each order, check if there are any approved payment change requests
    const ordersWithApprovalStatus = await Promise.all(
      result.map(async (order) => {
        const [approvedRequest] = await db
          .select({
            id: paymentChangeRequests.id,
            status: paymentChangeRequests.status
          })
          .from(paymentChangeRequests)
          .where(
            and(
              eq(paymentChangeRequests.orderId, order.id),
              eq(paymentChangeRequests.deliveryBoyId, deliveryBoyUserId),
              eq(paymentChangeRequests.status, 'APPROVED')
            )
          )
          .limit(1);
        
        return {
          ...order,
          paymentChangeApproved: !!approvedRequest
        };
      })
    );
    
    return ordersWithApprovalStatus;
  }

  async getOrderForDeliveryBoy(orderId: string, deliveryBoyUserId: string): Promise<any> {
    const [result] = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalAmount: orders.totalAmount,
        deliveryType: orders.deliveryType,
        deliveryAt: orders.deliveryAt,
        note: orders.note,
        paymentReceived: orders.paymentReceived,
        amountReceived: orders.amountReceived,
        remainingBalance: orders.remainingBalance,
        isPartialPayment: orders.isPartialPayment,
        createdAt: orders.createdAt,
        ownerId: orders.ownerId,
        retailerId: orders.retailerId,
        store: {
          id: stores.id,
          name: stores.name,
          address: stores.address,
          city: stores.city,
          pincode: stores.pincode,
        },
        owner: {
          id: users.id,
          fullName: users.fullName,
          phone: users.phone,
        }
      })
      .from(orders)
      .innerJoin(stores, eq(orders.storeId, stores.id))
      .innerJoin(users, eq(orders.ownerId, users.id))
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.assignedDeliveryBoyId, deliveryBoyUserId)
        )
      );
    
    return result;
  }

  // Payment change requests
  async createPaymentChangeRequest(request: InsertPaymentChangeRequest): Promise<PaymentChangeRequest> {
    const [result] = await db.insert(paymentChangeRequests).values(request).returning();
    return result;
  }

  async getPaymentChangeRequest(id: string): Promise<any> {
    const [result] = await db
      .select({
        id: paymentChangeRequests.id,
        orderId: paymentChangeRequests.orderId,
        deliveryBoyId: paymentChangeRequests.deliveryBoyId,
        originalAmount: paymentChangeRequests.originalAmount,
        requestedAmount: paymentChangeRequests.requestedAmount,
        reason: paymentChangeRequests.reason,
        status: paymentChangeRequests.status,
        approvedBy: paymentChangeRequests.approvedBy,
        approvedAt: paymentChangeRequests.approvedAt,
        createdAt: paymentChangeRequests.createdAt,
        order: {
          id: orders.id,
          ownerId: orders.ownerId,
          retailerId: orders.retailerId,
          status: orders.status,
        }
      })
      .from(paymentChangeRequests)
      .innerJoin(orders, eq(paymentChangeRequests.orderId, orders.id))
      .where(eq(paymentChangeRequests.id, id));
    
    return result;
  }

  async getPaymentChangeRequestsForShopOwner(shopOwnerId: string): Promise<any[]> {
    const result = await db
      .select({
        id: paymentChangeRequests.id,
        orderId: paymentChangeRequests.orderId,
        originalAmount: paymentChangeRequests.originalAmount,
        requestedAmount: paymentChangeRequests.requestedAmount,
        reason: paymentChangeRequests.reason,
        status: paymentChangeRequests.status,
        createdAt: paymentChangeRequests.createdAt,
        deliveryBoy: {
          id: users.id,
          fullName: users.fullName,
        },
        order: {
          id: orders.id,
          status: orders.status,
        }
      })
      .from(paymentChangeRequests)
      .innerJoin(orders, eq(paymentChangeRequests.orderId, orders.id))
      .innerJoin(users, eq(paymentChangeRequests.deliveryBoyId, users.id))
      .where(
        and(
          eq(orders.ownerId, shopOwnerId),
          eq(paymentChangeRequests.status, 'PENDING')
        )
      )
      .orderBy(desc(paymentChangeRequests.createdAt));
    
    return result;
  }

  async updatePaymentChangeRequestStatus(id: string, status: string): Promise<PaymentChangeRequest> {
    const [result] = await db
      .update(paymentChangeRequests)
      .set({ 
        status,
        approvedAt: status === 'APPROVED' ? new Date() : undefined
      })
      .where(eq(paymentChangeRequests.id, id))
      .returning();
    
    return result;
  }

  async getPaymentChangeRequestsForOrder(orderId: string): Promise<any[]> {
    const result = await db
      .select({
        id: paymentChangeRequests.id,
        orderId: paymentChangeRequests.orderId,
        deliveryBoyId: paymentChangeRequests.deliveryBoyId,
        originalAmount: paymentChangeRequests.originalAmount,
        requestedAmount: paymentChangeRequests.requestedAmount,
        reason: paymentChangeRequests.reason,
        status: paymentChangeRequests.status,
        createdAt: paymentChangeRequests.createdAt,
        approvedAt: paymentChangeRequests.approvedAt
      })
      .from(paymentChangeRequests)
      .where(eq(paymentChangeRequests.orderId, orderId))
      .orderBy(desc(paymentChangeRequests.createdAt));
    
    return result;
  }

  // Order amount updates
  async updateOrderAmount(orderId: string, newAmount: string): Promise<Order> {
    const [result] = await db
      .update(orders)
      .set({ 
        totalAmount: newAmount,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();
    
    return result;
  }

  // Khatabook operations
  async createKhatabookEntry(entry: InsertKhatabook): Promise<Khatabook> {
    // Calculate the new balance
    const currentBalance = await this.getCurrentBalance(entry.userId, entry.counterpartyId || undefined);
    const newBalance = entry.entryType === 'CREDIT' 
      ? (currentBalance + parseFloat(entry.amount.toString()))
      : (currentBalance - parseFloat(entry.amount.toString()));
    
    const [result] = await db.insert(khatabook).values({
      ...entry,
      balance: newBalance.toString()
    }).returning();
    
    return result;
  }

  private async getCurrentBalance(userId: string, counterpartyId?: string): Promise<number> {
    const conditions = [eq(khatabook.userId, userId)];
    if (counterpartyId) {
      conditions.push(eq(khatabook.counterpartyId, counterpartyId));
    }

    const [result] = await db
      .select({ balance: khatabook.balance })
      .from(khatabook)
      .where(and(...conditions))
      .orderBy(desc(khatabook.createdAt))
      .limit(1);
    
    return result ? parseFloat(result.balance.toString()) : 0;
  }
  // Get popular retailers based on order volume and ratings
  async getPopularRetailers(limit: number = 10): Promise<any[]> {
    const popularRetailers = await db
      .select({
        id: stores.id,
        name: stores.name,
        city: stores.city,
        pincode: stores.pincode,
        isOpen: stores.isOpen,
        rating: sql<number>`AVG(CAST(${stores.rating} AS DECIMAL))`.as('rating'),
        orderCount: sql<number>`COUNT(${orders.id})`.as('orderCount')
      })
      .from(stores)
      .leftJoin(orders, eq(stores.id, orders.retailerId))
      .groupBy(stores.id, stores.name, stores.city, stores.pincode, stores.isOpen)
      .orderBy(sql`COUNT(${orders.id}) DESC`, sql`AVG(CAST(${stores.rating} AS DECIMAL)) DESC`)
      .limit(limit);
    
    return popularRetailers;
  }

  // Get available delivery boys (all delivery boys for now - could be enhanced with availability status)
  async getAvailableDeliveryBoys(): Promise<any[]> {
    const deliveryBoys = await db
      .select({
        id: users.id,
        name: users.fullName,
        phone: users.phone,
        email: users.email
      })
      .from(users)
      .where(eq(users.role, 'DELIVERY_BOY'));
    
    return deliveryBoys;
  }

  // Get retailer-specific balances for shop owner khatabook
  async getRetailerBalancesForShopOwner(shopOwnerId: string): Promise<any[]> {
    const retailerBalances = await db
      .select({
        retailerId: stores.id,
        retailerName: stores.name,
        currentBalance: sql<number>`
          COALESCE(SUM(CASE 
            WHEN ${khatabook.entryType} = 'CREDIT' THEN ${khatabook.amount}
            WHEN ${khatabook.entryType} = 'DEBIT' THEN -${khatabook.amount}
            ELSE 0
          END), 0)`.as('currentBalance'),
        totalCredits: sql<number>`
          COALESCE(SUM(CASE 
            WHEN ${khatabook.entryType} = 'CREDIT' THEN ${khatabook.amount}
            ELSE 0
          END), 0)`.as('totalCredits'),
        totalDebits: sql<number>`
          COALESCE(SUM(CASE 
            WHEN ${khatabook.entryType} = 'DEBIT' THEN ${khatabook.amount}
            ELSE 0
          END), 0)`.as('totalDebits')
      })
      .from(stores)
      .leftJoin(orders, eq(stores.id, orders.retailerId))
      .leftJoin(khatabook, eq(orders.id, khatabook.orderId))
      .where(eq(orders.ownerId, shopOwnerId))
      .groupBy(stores.id, stores.name)
      .having(sql`COUNT(${orders.id}) > 0`);
    
    return retailerBalances;
  }

  // Admin overview operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllOrdersForAdmin(): Promise<any[]> {
    return await db.query.orders.findMany({
      with: {
        owner: true,
        retailer: true,
        store: true,
        items: {
          with: {
            listing: {
              with: {
                product: true
              }
            }
          }
        }
      },
      orderBy: desc(orders.createdAt),
      limit: 50
    });
  }

  async getSystemAnalytics(): Promise<any> {
    const totalUsers = await db.select({ count: sql`count(*)` }).from(users);
    const totalStores = await db.select({ count: sql`count(*)` }).from(stores);
    const totalProducts = await db.select({ count: sql`count(*)` }).from(productCatalog);
    const totalOrders = await db.select({ count: sql`count(*)` }).from(orders);
    
    const usersByRole = await db.select({
      role: users.role,
      count: sql`count(*)`
    }).from(users).groupBy(users.role);

    const ordersByStatus = await db.select({
      status: orders.status,
      count: sql`count(*)`
    }).from(orders).groupBy(orders.status);

    return {
      totals: {
        users: totalUsers[0]?.count || 0,
        stores: totalStores[0]?.count || 0,
        products: totalProducts[0]?.count || 0,
        orders: totalOrders[0]?.count || 0
      },
      usersByRole,
      ordersByStatus
    };
  }

  // Delivery request operations
  async createDeliveryRequest(request: InsertDeliveryRequest): Promise<DeliveryRequest> {
    const [deliveryRequest] = await db.insert(deliveryRequests).values(request).returning();
    return deliveryRequest;
  }

  async getDeliveryRequest(id: string): Promise<DeliveryRequest | undefined> {
    const [request] = await db.select().from(deliveryRequests).where(eq(deliveryRequests.id, id));
    return request || undefined;
  }

  async getDeliveryRequestsByRetailer(retailerId: string): Promise<DeliveryRequest[]> {
    return await db.select().from(deliveryRequests)
      .where(eq(deliveryRequests.retailerId, retailerId))
      .orderBy(desc(deliveryRequests.createdAt));
  }

  async getOpenDeliveryRequests(): Promise<DeliveryRequest[]> {
    return await db.select().from(deliveryRequests)
      .where(eq(deliveryRequests.status, 'OPEN'))
      .orderBy(desc(deliveryRequests.createdAt));
  }

  async getAcceptedDeliveryRequestsByDeliveryBoy(deliveryBoyId: string): Promise<DeliveryRequest[]> {
    return await db.select().from(deliveryRequests)
      .where(and(
        eq(deliveryRequests.acceptedBy, deliveryBoyId),
        eq(deliveryRequests.status, 'ACCEPTED')
      ))
      .orderBy(desc(deliveryRequests.acceptedAt));
  }

  async acceptDeliveryRequest(id: string, deliveryBoyId: string): Promise<DeliveryRequest> {
    const [request] = await db.update(deliveryRequests)
      .set({ 
        status: 'ACCEPTED', 
        acceptedBy: deliveryBoyId, 
        acceptedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(deliveryRequests.id, id))
      .returning();
    return request;
  }

  async rejectDeliveryRequest(id: string): Promise<DeliveryRequest> {
    const [request] = await db.update(deliveryRequests)
      .set({ 
        status: 'REJECTED',
        updatedAt: new Date()
      })
      .where(eq(deliveryRequests.id, id))
      .returning();
    return request;
  }

  async completeDeliveryRequest(id: string, notes?: string): Promise<DeliveryRequest> {
    const [request] = await db.update(deliveryRequests)
      .set({ 
        status: 'COMPLETED', 
        completedAt: new Date(),
        notes,
        updatedAt: new Date()
      })
      .where(eq(deliveryRequests.id, id))
      .returning();
    return request;
  }
}

export const storage = new DatabaseStorage();
