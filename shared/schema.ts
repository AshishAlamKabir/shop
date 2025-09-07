import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, boolean, decimal, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum('role', ['ADMIN', 'RETAILER', 'SHOP_OWNER', 'DELIVERY_BOY']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'ACCEPTED', 'REJECTED', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED']);
export const deliveryTypeEnum = pgEnum('delivery_type', ['PICKUP', 'DELIVERY']);
export const deliveryRequestStatusEnum = pgEnum('delivery_request_status', ['OPEN', 'ACCEPTED', 'REJECTED', 'COMPLETED']);
export const ledgerEntryTypeEnum = pgEnum('ledger_entry_type', ['CREDIT', 'DEBIT']);
export const ledgerTransactionTypeEnum = pgEnum('ledger_transaction_type', ['ORDER_PLACED', 'ORDER_DEBIT', 'PAYMENT_RECEIVED', 'PAYMENT_CREDIT', 'BALANCE_CLEAR_CREDIT', 'PAYMENT_ADJUSTED', 'ADJUSTMENT', 'REFUND', 'COMMISSION']);

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stores = pgTable("stores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  city: text("city"),
  pincode: text("pincode"),
  logoUrl: text("logo_url"),
  isOpen: boolean("is_open").default(true),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productCatalog = pgTable("product_catalog", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  brand: text("brand"),
  imageUrl: text("image_url"),
  unit: text("unit").notNull(), // kg, piece, box, liter
  size: text("size"), // 500g, 1L, 10pcs
  isWholesale: boolean("is_wholesale").default(false),
  createdById: varchar("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const listings = pgTable("listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull(),
  productId: varchar("product_id").notNull(),
  priceRetail: decimal("price_retail", { precision: 10, scale: 2 }).notNull(),
  priceWholesale: decimal("price_wholesale", { precision: 10, scale: 2 }),
  available: boolean("available").default(true),
  stockQty: integer("stock_qty"),
  sku: text("sku").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(),
  retailerId: varchar("retailer_id").notNull(),
  storeId: varchar("store_id").notNull(),
  status: orderStatusEnum("status").default('PENDING'),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0"),
  deliveryType: deliveryTypeEnum("delivery_type").default('PICKUP'),
  deliveryAt: timestamp("delivery_at"),
  note: text("note"),
  // Payment confirmation fields
  paymentReceived: boolean("payment_received").default(false),
  amountReceived: decimal("amount_received", { precision: 10, scale: 2 }),
  originalAmountReceived: decimal("original_amount_received", { precision: 10, scale: 2 }),
  remainingBalance: decimal("remaining_balance", { precision: 10, scale: 2 }).default("0"),
  isPartialPayment: boolean("is_partial_payment").default(false),
  paymentReceivedAt: timestamp("payment_received_at"),
  paymentReceivedBy: varchar("payment_received_by"), // delivery boy user id
  amountAdjustedBy: varchar("amount_adjusted_by"), // shop owner user id
  amountAdjustedAt: timestamp("amount_adjusted_at"),
  adjustmentNote: text("adjustment_note"),
  assignedDeliveryBoyId: varchar("assigned_delivery_boy_id"), // delivery boy assigned to this order
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  listingId: varchar("listing_id").notNull(),
  qty: integer("qty").notNull(),
  priceAt: decimal("price_at", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderEvents = pgTable("order_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  type: text("type").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fcmTokens = pgTable("fcm_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const khatabook = pgTable("khatabook", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // shop owner or retailer
  counterpartyId: varchar("counterparty_id"), // the other party in the transaction
  orderId: varchar("order_id"), // related order (optional)
  entryType: ledgerEntryTypeEnum("entry_type").notNull(), // CREDIT or DEBIT
  transactionType: ledgerTransactionTypeEnum("transaction_type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(), // running balance
  description: text("description").notNull(),
  referenceId: varchar("reference_id"), // order id, payment id, etc.
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentAuditTrail = pgTable("payment_audit_trail", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  userId: varchar("user_id").notNull(), // who made the change
  action: text("action").notNull(), // PAYMENT_RECEIVED, AMOUNT_ADJUSTED, BALANCE_SETTLED
  oldAmount: decimal("old_amount", { precision: 10, scale: 2 }),
  newAmount: decimal("new_amount", { precision: 10, scale: 2 }),
  reason: text("reason"),
  metadata: text("metadata"), // JSON string for additional context
  createdAt: timestamp("created_at").defaultNow(),
});


export const deliveryRequests = pgTable("delivery_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  retailerId: varchar("retailer_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  pickupAddress: text("pickup_address").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  estimatedDistance: decimal("estimated_distance", { precision: 8, scale: 2 }), // in kilometers
  estimatedPayment: decimal("estimated_payment", { precision: 10, scale: 2 }).notNull(),
  orderId: varchar("order_id"), // optional link to specific order
  status: deliveryRequestStatusEnum("status").default('OPEN'),
  acceptedBy: varchar("accepted_by"), // delivery boy user id
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentChangeRequests = pgTable("payment_change_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  deliveryBoyId: varchar("delivery_boy_id").notNull(),
  originalAmount: decimal("original_amount", { precision: 10, scale: 2 }).notNull(),
  requestedAmount: decimal("requested_amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default('PENDING'), // PENDING, APPROVED, REJECTED
  approvedBy: varchar("approved_by"), // shop owner user id
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  store: one(stores, { fields: [users.id], references: [stores.ownerId] }),
  fcmTokens: many(fcmTokens),
  ordersAsOwner: many(orders, { relationName: "ownerOrders" }),
  ordersAsRetailer: many(orders, { relationName: "retailerOrders" }),
  createdProducts: many(productCatalog),
  ledgerEntries: many(khatabook),
  deliveryRequests: many(deliveryRequests),
  acceptedDeliveryRequests: many(deliveryRequests, { relationName: "acceptedDeliveryRequests" }),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  owner: one(users, { fields: [stores.ownerId], references: [users.id] }),
  listings: many(listings),
  orders: many(orders),
}));

export const productCatalogRelations = relations(productCatalog, ({ one, many }) => ({
  createdBy: one(users, { fields: [productCatalog.createdById], references: [users.id] }),
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  store: one(stores, { fields: [listings.storeId], references: [stores.id] }),
  product: one(productCatalog, { fields: [listings.productId], references: [productCatalog.id] }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  owner: one(users, { fields: [orders.ownerId], references: [users.id], relationName: "ownerOrders" }),
  retailer: one(users, { fields: [orders.retailerId], references: [users.id], relationName: "retailerOrders" }),
  store: one(stores, { fields: [orders.storeId], references: [stores.id] }),
  items: many(orderItems),
  timeline: many(orderEvents),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  listing: one(listings, { fields: [orderItems.listingId], references: [listings.id] }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));

export const fcmTokensRelations = relations(fcmTokens, ({ one }) => ({
  user: one(users, { fields: [fcmTokens.userId], references: [users.id] }),
}));

export const khatabookRelations = relations(khatabook, ({ one }) => ({
  user: one(users, { fields: [khatabook.userId], references: [users.id] }),
  counterparty: one(users, { fields: [khatabook.counterpartyId], references: [users.id] }),
  order: one(orders, { fields: [khatabook.orderId], references: [orders.id] }),
}));

export const paymentAuditTrailRelations = relations(paymentAuditTrail, ({ one }) => ({
  order: one(orders, { fields: [paymentAuditTrail.orderId], references: [orders.id] }),
  user: one(users, { fields: [paymentAuditTrail.userId], references: [users.id] }),
}));


export const deliveryRequestsRelations = relations(deliveryRequests, ({ one }) => ({
  retailer: one(users, { fields: [deliveryRequests.retailerId], references: [users.id] }),
  acceptedBy: one(users, { fields: [deliveryRequests.acceptedBy], references: [users.id], relationName: "acceptedDeliveryRequests" }),
  order: one(orders, { fields: [deliveryRequests.orderId], references: [orders.id] }),
}));

export const paymentChangeRequestsRelations = relations(paymentChangeRequests, ({ one }) => ({
  order: one(orders, { fields: [paymentChangeRequests.orderId], references: [orders.id] }),
  deliveryBoy: one(users, { fields: [paymentChangeRequests.deliveryBoyId], references: [users.id] }),
  approver: one(users, { fields: [paymentChangeRequests.approvedBy], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductCatalogSchema = createInsertSchema(productCatalog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  priceRetail: z.union([z.string(), z.number()]).transform(val => String(val)),
  priceWholesale: z.union([z.string(), z.number(), z.null()]).transform(val => val === null ? null : String(val)),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
});

export const insertOrderEventSchema = createInsertSchema(orderEvents).omit({
  id: true,
  createdAt: true,
});

export const insertFcmTokenSchema = createInsertSchema(fcmTokens).omit({
  id: true,
  createdAt: true,
});

export const insertKhatabookSchema = createInsertSchema(khatabook).omit({
  id: true,
  createdAt: true,
}).partial({
  balance: true,
});

export const insertPaymentAuditTrailSchema = createInsertSchema(paymentAuditTrail).omit({
  id: true,
  createdAt: true,
});


export const insertDeliveryRequestSchema = createInsertSchema(deliveryRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentChangeRequestSchema = createInsertSchema(paymentChangeRequests).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type ProductCatalog = typeof productCatalog.$inferSelect;
export type InsertProductCatalog = z.infer<typeof insertProductCatalogSchema>;
export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type InsertOrderEvent = z.infer<typeof insertOrderEventSchema>;
export type FcmToken = typeof fcmTokens.$inferSelect;
export type InsertFcmToken = z.infer<typeof insertFcmTokenSchema>;
export type Khatabook = typeof khatabook.$inferSelect;
export type InsertKhatabook = z.infer<typeof insertKhatabookSchema>;
export type PaymentAuditTrail = typeof paymentAuditTrail.$inferSelect;
export type InsertPaymentAuditTrail = z.infer<typeof insertPaymentAuditTrailSchema>;
export type DeliveryRequest = typeof deliveryRequests.$inferSelect;
export type InsertDeliveryRequest = z.infer<typeof insertDeliveryRequestSchema>;
export type PaymentChangeRequest = typeof paymentChangeRequests.$inferSelect;
export type InsertPaymentChangeRequest = z.infer<typeof insertPaymentChangeRequestSchema>;
