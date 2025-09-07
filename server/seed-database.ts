import { db } from './db.js';
import * as schema from '../shared/schema.js';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

// Helper function to generate random data
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDecimal = (min: number, max: number): string => (Math.random() * (max - min) + min).toFixed(2);

// Sample data arrays
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Robert', 'Emily', 'James', 'Lisa', 'William', 'Jessica', 'Richard', 'Ashley', 'Joseph', 'Amanda', 'Thomas', 'Jennifer', 'Christopher', 'Michelle', 'Daniel', 'Kimberly', 'Matthew', 'Amy', 'Anthony'];
const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen'];
const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri', 'Patna', 'Vadodara'];
const storeNames = ['Super Mart', 'Quick Store', 'Daily Needs', 'Fresh Market', 'City Store', 'Local Bazaar', 'Corner Shop', 'Express Mart', 'Prime Store', 'Elite Shop', 'Metro Mart', 'Urban Store', 'Classic Shop', 'Royal Market', 'Golden Store', 'Silver Shop', 'Diamond Mart', 'Platinum Store', 'Crystal Shop', 'Pearl Market'];
const productNames = ['Rice', 'Wheat Flour', 'Sugar', 'Salt', 'Cooking Oil', 'Basmati Rice', 'Lentils', 'Chickpeas', 'Tea', 'Coffee', 'Milk', 'Bread', 'Eggs', 'Onions', 'Potatoes', 'Tomatoes', 'Apples', 'Bananas', 'Oranges', 'Mangoes', 'Chicken', 'Mutton', 'Fish', 'Paneer', 'Yogurt'];
const brands = ['Tata', 'Amul', 'Patanjali', 'Fortune', 'Aashirvaad', 'Saffola', 'Maggi', 'Nestle', 'Britannia', 'Parle', 'ITC', 'Dabur', 'Himalaya', 'Godrej', 'Unilever', 'P&G', 'Colgate', 'Pepsico', 'Coca Cola', 'Cadbury'];
const units = ['kg', 'piece', 'box', 'liter', 'packet', 'bag', 'bottle', 'can', 'jar', 'pouch'];
const sizes = ['500g', '1kg', '2kg', '5kg', '250ml', '500ml', '1L', '2L', '12pcs', '24pcs', '6pcs'];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // 1. Create 50 Users (including test credentials)
    console.log('Creating users...');
    const users = [];
    const adminCount = 10;
    const retailerCount = 20;
    const shopOwnerCount = 20;
    
    // Create test users with known passwords
    const testUsers = [
      { email: 'admin@test.com', password: 'admin123', role: 'ADMIN' as const, fullName: 'Test Admin' },
      { email: 'retailer@test.com', password: 'retailer123', role: 'RETAILER' as const, fullName: 'Test Retailer' },
      { email: 'shop@test.com', password: 'shop123', role: 'SHOP_OWNER' as const, fullName: 'Test Shop Owner' },
      { email: 'delivery@test.com', password: 'delivery123', role: 'DELIVERY_BOY' as const, fullName: 'Test Delivery Boy' },
    ];

    for (const testUser of testUsers) {
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const [user] = await db.insert(schema.users).values({
        id: nanoid(),
        email: testUser.email,
        passwordHash: hashedPassword,
        role: testUser.role,
        fullName: testUser.fullName,
        phone: `+91${getRandomInt(7000000000, 9999999999)}`,
      }).returning();
      users.push(user);
      console.log(`✅ Created test user: ${testUser.email} (password: ${testUser.password})`);
    }

    // Create remaining users
    for (let i = 0; i < 46; i++) {
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      let role: 'ADMIN' | 'RETAILER' | 'SHOP_OWNER';
      
      if (i < adminCount - 1) role = 'ADMIN';
      else if (i < adminCount + retailerCount - 1) role = 'RETAILER';
      else role = 'SHOP_OWNER';

      const hashedPassword = await bcrypt.hash('password123', 10);
      const [user] = await db.insert(schema.users).values({
        id: nanoid(),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        passwordHash: hashedPassword,
        role,
        fullName: `${firstName} ${lastName}`,
        phone: `+91${getRandomInt(7000000000, 9999999999)}`,
      }).returning();
      users.push(user);
    }
    console.log(`✅ Created ${users.length} users`);

    const adminUsers = users.filter(u => u.role === 'ADMIN');
    const retailerUsers = users.filter(u => u.role === 'RETAILER');
    const shopOwnerUsers = users.filter(u => u.role === 'SHOP_OWNER');

    // 2. Create Stores (one per retailer - retailers manage stores)
    console.log('Creating stores...');
    const stores = [];
    for (let i = 0; i < retailerUsers.length; i++) {
      const owner = retailerUsers[i];
      const [store] = await db.insert(schema.stores).values({
        ownerId: owner.id,
        name: `${getRandomElement(storeNames)} ${i + 1}`,
        description: `A well-stocked store providing quality products for daily needs.`,
        address: `${getRandomInt(1, 999)}, ${getRandomElement(['Main Road', 'Market Street', 'Gandhi Road', 'Station Road', 'Park Street'])}`,
        city: getRandomElement(cities),
        pincode: `${getRandomInt(100000, 999999)}`,
        logoUrl: `https://via.placeholder.com/200x200?text=Store${i + 1}`,
        isOpen: Math.random() > 0.1,
        rating: getRandomDecimal(3.5, 5.0),
      }).returning();
      stores.push(store);
    }
    console.log(`✅ Created ${stores.length} stores`);

    // 3. Create 50 Product Catalog entries
    console.log('Creating product catalog...');
    const products = [];
    for (let i = 0; i < 50; i++) {
      const [product] = await db.insert(schema.productCatalog).values({
        name: `${getRandomElement(productNames)} ${i + 1}`,
        brand: getRandomElement(brands),
        imageUrl: `https://via.placeholder.com/300x300?text=Product${i + 1}`,
        unit: getRandomElement(units),
        size: getRandomElement(sizes),
        isWholesale: Math.random() > 0.7,
        createdById: getRandomElement(adminUsers).id,
      }).returning();
      products.push(product);
    }
    console.log(`✅ Created ${products.length} products`);

    // 4. Create Listings (10-15 per store to reach good coverage)  
    console.log('Creating listings...');
    const listings = [];
    const totalListings = Math.max(200, stores.length * 10);
    for (let i = 0; i < totalListings; i++) {
      const store = getRandomElement(stores);
      const product = getRandomElement(products);
      const retailPrice = getRandomDecimal(10, 500);
      const [listing] = await db.insert(schema.listings).values({
        storeId: store.id,
        productId: product.id,
        priceRetail: retailPrice,
        priceWholesale: product.isWholesale ? getRandomDecimal(8, parseFloat(retailPrice) * 0.9) : null,
        available: Math.random() > 0.1,
        stockQty: getRandomInt(0, 1000),
        sku: `SKU-${store.id.slice(-6)}-${product.id.slice(-6)}-${i}`,
      }).returning();
      listings.push(listing);
    }
    console.log(`✅ Created ${listings.length} listings`);

    // 5. Create 50 Orders
    console.log('Creating orders...');
    const orders = [];
    for (let i = 0; i < 50; i++) {
      const store = getRandomElement(stores);
      const retailer = getRandomElement(retailerUsers);
      const totalAmount = getRandomDecimal(100, 5000);
      const isPartialPayment = Math.random() > 0.7;
      const [order] = await db.insert(schema.orders).values({
        ownerId: store.ownerId,
        retailerId: retailer.id,
        storeId: store.id,
        status: getRandomElement(['PENDING', 'ACCEPTED', 'REJECTED', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED']),
        totalAmount,
        deliveryType: getRandomElement(['PICKUP', 'DELIVERY']),
        deliveryAt: new Date(Date.now() + getRandomInt(1, 7) * 24 * 60 * 60 * 1000),
        note: `Order note ${i + 1}`,
        paymentReceived: Math.random() > 0.3,
        amountReceived: isPartialPayment ? getRandomDecimal(50, parseFloat(totalAmount) * 0.8) : totalAmount,
        originalAmountReceived: totalAmount,
        remainingBalance: isPartialPayment ? getRandomDecimal(20, parseFloat(totalAmount) * 0.5) : '0',
        isPartialPayment,
        paymentReceivedAt: Math.random() > 0.5 ? new Date() : null,
      }).returning();
      orders.push(order);
    }
    console.log(`✅ Created ${orders.length} orders`);

    // 6. Create Order Items (2-5 items per order)
    console.log('Creating order items...');
    const orderItems = [];
    for (const order of orders) {
      const itemCount = getRandomInt(2, 5);
      const storeListings = listings.filter(l => l.storeId === order.storeId);
      
      for (let i = 0; i < itemCount && storeListings.length > 0; i++) {
        const listing = getRandomElement(storeListings);
        const [orderItem] = await db.insert(schema.orderItems).values({
          orderId: order.id,
          listingId: listing.id,
          qty: getRandomInt(1, 10),
          priceAt: listing.priceRetail,
        }).returning();
        orderItems.push(orderItem);
      }
    }
    console.log(`✅ Created ${orderItems.length} order items`);

    // 7. Create Order Events
    console.log('Creating order events...');
    const orderEvents = [];
    for (let i = 0; i < 100; i++) {
      const order = getRandomElement(orders);
      const [event] = await db.insert(schema.orderEvents).values({
        orderId: order.id,
        type: getRandomElement(['ORDER_PLACED', 'ORDER_ACCEPTED', 'ORDER_READY', 'OUT_FOR_DELIVERY', 'DELIVERED']),
        message: `Order event message ${i + 1}`,
      }).returning();
      orderEvents.push(event);
    }
    console.log(`✅ Created ${orderEvents.length} order events`);

    // 8. Create FCM Tokens
    console.log('Creating FCM tokens...');
    const fcmTokens = [];
    for (let i = 0; i < 75; i++) {
      const user = getRandomElement(users);
      const [token] = await db.insert(schema.fcmTokens).values({
        userId: user.id,
        token: `fcm_token_${nanoid(20)}_${i}`,
      }).returning();
      fcmTokens.push(token);
    }
    console.log(`✅ Created ${fcmTokens.length} FCM tokens`);

    // 9. Create Khatabook entries
    console.log('Creating khatabook entries...');
    const khatabookEntries = [];
    for (let i = 0; i < 100; i++) {
      const user = getRandomElement([...retailerUsers, ...shopOwnerUsers]);
      const counterparty = getRandomElement(users.filter(u => u.id !== user.id));
      const amount = getRandomDecimal(100, 10000);
      const [entry] = await db.insert(schema.khatabook).values({
        userId: user.id,
        counterpartyId: counterparty.id,
        orderId: Math.random() > 0.5 ? getRandomElement(orders).id : null,
        entryType: getRandomElement(['CREDIT', 'DEBIT']),
        transactionType: getRandomElement(['ORDER_PLACED', 'ORDER_DEBIT', 'PAYMENT_RECEIVED', 'PAYMENT_CREDIT', 'BALANCE_CLEAR_CREDIT', 'PAYMENT_ADJUSTED', 'ADJUSTMENT', 'REFUND', 'COMMISSION']),
        amount,
        balance: getRandomDecimal(0, 50000),
        description: `Khatabook entry ${i + 1}`,
        referenceId: nanoid(10),
        metadata: JSON.stringify({ note: `Metadata for entry ${i + 1}` }),
      }).returning();
      khatabookEntries.push(entry);
    }
    console.log(`✅ Created ${khatabookEntries.length} khatabook entries`);

    // 10. Create Payment Audit Trail
    console.log('Creating payment audit trail...');
    const auditEntries = [];
    for (let i = 0; i < 75; i++) {
      const order = getRandomElement(orders);
      const user = getRandomElement(users);
      const [audit] = await db.insert(schema.paymentAuditTrail).values({
        orderId: order.id,
        userId: user.id,
        action: getRandomElement(['PAYMENT_RECEIVED', 'AMOUNT_ADJUSTED', 'BALANCE_SETTLED']),
        oldAmount: getRandomDecimal(100, 1000),
        newAmount: getRandomDecimal(100, 1000),
        reason: `Audit reason ${i + 1}`,
        metadata: JSON.stringify({ auditNote: `Audit metadata ${i + 1}` }),
      }).returning();
      auditEntries.push(audit);
    }
    console.log(`✅ Created ${auditEntries.length} payment audit entries`);

    // 11. Create Delivery Boys
    console.log('Creating delivery boys...');
    const deliveryBoys = [];
    for (let i = 0; i < 50; i++) {
      const retailer = getRandomElement(retailerUsers);
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      const [deliveryBoy] = await db.insert(schema.deliveryBoys).values({
        retailerId: retailer.id,
        name: `${firstName} ${lastName}`,
        phone: `+91${getRandomInt(7000000000, 9999999999)}`,
        address: `${getRandomInt(1, 999)}, ${getRandomElement(['Delivery Lane', 'Service Road', 'Express Street'])}`,
        isActive: Math.random() > 0.1,
      }).returning();
      deliveryBoys.push(deliveryBoy);
    }
    console.log(`✅ Created ${deliveryBoys.length} delivery boys`);

    console.log(`
🎉 Database seeded successfully!

📊 Summary:
• Users: ${users.length}
• Stores: ${stores.length}  
• Products: ${products.length}
• Listings: ${listings.length}
• Orders: ${orders.length}
• Order Items: ${orderItems.length}
• Order Events: ${orderEvents.length}
• FCM Tokens: ${fcmTokens.length}
• Khatabook Entries: ${khatabookEntries.length}
• Payment Audits: ${auditEntries.length}
• Delivery Boys: ${deliveryBoys.length}

🔐 Test Login Credentials:
• Admin: admin@test.com / admin123
• Retailer: retailer@test.com / retailer123  
• Shop Owner: shop@test.com / shop123
• Delivery Boy: delivery@test.com / delivery123
• Others: [name].[surname][number]@example.com / password123
    `);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seeding
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedDatabase };