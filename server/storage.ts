import { 
  users, stores, productCatalog, listings, orders, orderItems, orderEvents, fcmTokens, khatabook,
  type User, type InsertUser, type Store, type InsertStore,
  type ProductCatalog, type InsertProductCatalog, type Listing, type InsertListing,
  type Order, type InsertOrder, type OrderItem, type InsertOrderItem,
  type OrderEvent, type InsertOrderEvent, type FcmToken, type InsertFcmToken,
  type Khatabook, type InsertKhatabook
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Store operations
  getStore(id: string): Promise<Store | undefined>;
  getStoreByOwnerId(ownerId: string): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: string, store: Partial<InsertStore>): Promise<Store>;
  getStores(filters?: { city?: string; pincode?: string; search?: string }): Promise<Store[]>;
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
  getLedgerEntries(userId: string, options?: { page?: number; limit?: number; type?: string }): Promise<any>;
  getLedgerSummary(userId: string): Promise<any>;
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
    const [user] = await db.insert(users).values(insertUser).returning();
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

  async getStores(filters?: { city?: string; pincode?: string; search?: string }): Promise<Store[]> {
    let query = db.select().from(stores);
    
    if (filters?.city) {
      query = query.where(eq(stores.city, filters.city));
    }
    if (filters?.pincode) {
      query = query.where(eq(stores.pincode, filters.pincode));
    }
    if (filters?.search) {
      query = query.where(like(stores.name, `%${filters.search}%`));
    }
    
    return await query;
  }

  async getStoreWithListings(storeId: string): Promise<any> {
    const store = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
      with: {
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

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const [order] = await db.update(orders).set({ status: status as any, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
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
    // Calculate running balance for the user
    const lastEntry = await db.select({ balance: khatabook.balance })
      .from(khatabook)
      .where(eq(khatabook.userId, entry.userId))
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

  async getLedgerEntries(userId: string, options: { page?: number; limit?: number; type?: string } = {}): Promise<any> {
    const { page = 1, limit = 20, type } = options;
    const offset = (page - 1) * limit;
    
    let query = db.select({
      id: khatabook.id,
      entryType: khatabook.entryType,
      transactionType: khatabook.transactionType,
      amount: khatabook.amount,
      balance: khatabook.balance,
      description: khatabook.description,
      referenceId: khatabook.referenceId,
      createdAt: khatabook.createdAt,
      orderId: khatabook.orderId
    })
    .from(khatabook)
    .where(eq(khatabook.userId, userId));
    
    if (type) {
      query = query.where(and(eq(khatabook.userId, userId), eq(khatabook.entryType, type)));
    }
    
    const entries = await query
      .orderBy(desc(khatabook.createdAt))
      .limit(limit)
      .offset(offset);
    
    const total = await db.select({ count: sql<number>`count(*)` })
      .from(khatabook)
      .where(eq(khatabook.userId, userId));
    
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

  async getLedgerSummary(userId: string): Promise<any> {
    const lastEntry = await db.select({ balance: khatabook.balance })
      .from(khatabook)
      .where(eq(khatabook.userId, userId))
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
    .where(eq(khatabook.userId, userId));
    
    // Get recent transactions
    const recentTransactions = await db.select({
      id: khatabook.id,
      entryType: khatabook.entryType,
      transactionType: khatabook.transactionType,
      amount: khatabook.amount,
      description: khatabook.description,
      createdAt: khatabook.createdAt
    })
    .from(khatabook)
    .where(eq(khatabook.userId, userId))
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
}

export const storage = new DatabaseStorage();
