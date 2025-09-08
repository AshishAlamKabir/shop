/**
 * SEED CONFIGURATION FOR FUTURE AGENT REQUIREMENTS
 * 
 * This file contains configuration templates that can be easily modified
 * by future agent prompts to accommodate new requirements.
 */

export interface SeedConfig {
  // User distribution
  ADMIN_COUNT: number;
  RETAILER_COUNT: number;
  SHOP_OWNER_COUNT: number;
  DELIVERY_BOY_COUNT: number;
  
  // Business data
  STORE_COUNT: number;
  PRODUCT_COUNT: number;
  LISTINGS_PER_STORE: number;
  ORDERS_COUNT: number;
  ITEMS_PER_ORDER: number;
  
  // Behavior settings
  CLEAR_EXISTING_DATA: boolean;
  CREATE_TEST_USERS: boolean;
  SEED_REALISTIC_DATA: boolean;
  
  // Test credentials
  TEST_USERS: Array<{
    email: string;
    password: string;
    role: 'ADMIN' | 'RETAILER' | 'SHOP_OWNER' | 'DELIVERY_BOY';
    fullName: string;
  }>;
}

// Default configuration - can be overridden by agent prompts
export const DEFAULT_CONFIG: SeedConfig = {
  ADMIN_COUNT: 10,
  RETAILER_COUNT: 20,
  SHOP_OWNER_COUNT: 20,
  DELIVERY_BOY_COUNT: 15,
  
  STORE_COUNT: 21,
  PRODUCT_COUNT: 50,
  LISTINGS_PER_STORE: 10,
  ORDERS_COUNT: 50,
  ITEMS_PER_ORDER: 3,
  
  CLEAR_EXISTING_DATA: true,
  CREATE_TEST_USERS: true,
  SEED_REALISTIC_DATA: true,
  
  TEST_USERS: [
    { email: 'admin@test.com', password: 'admin123', role: 'ADMIN', fullName: 'Test Admin' },
    { email: 'retailer@test.com', password: 'retailer123', role: 'RETAILER', fullName: 'Test Retailer' },
    { email: 'shop@test.com', password: 'shop123', role: 'SHOP_OWNER', fullName: 'Test Shop Owner' },
    { email: 'delivery@test.com', password: 'delivery123', role: 'DELIVERY_BOY', fullName: 'Test Delivery Boy' },
  ]
};

// Preset configurations for different scenarios
export const CONFIGS = {
  // Minimal setup for quick testing
  MINIMAL: {
    ...DEFAULT_CONFIG,
    ADMIN_COUNT: 1,
    RETAILER_COUNT: 2,
    SHOP_OWNER_COUNT: 2,
    DELIVERY_BOY_COUNT: 1,
    STORE_COUNT: 3,
    PRODUCT_COUNT: 10,
    ORDERS_COUNT: 5,
  } as SeedConfig,
  
  // Development setup with more data
  DEVELOPMENT: {
    ...DEFAULT_CONFIG,
    ADMIN_COUNT: 5,
    RETAILER_COUNT: 15,
    SHOP_OWNER_COUNT: 15,
    DELIVERY_BOY_COUNT: 10,
    STORE_COUNT: 20,
    PRODUCT_COUNT: 100,
    ORDERS_COUNT: 100,
  } as SeedConfig,
  
  // Production-like setup with extensive data
  PRODUCTION_LIKE: {
    ...DEFAULT_CONFIG,
    ADMIN_COUNT: 3,
    RETAILER_COUNT: 50,
    SHOP_OWNER_COUNT: 200,
    DELIVERY_BOY_COUNT: 30,
    STORE_COUNT: 50,
    PRODUCT_COUNT: 500,
    ORDERS_COUNT: 1000,
  } as SeedConfig,
  
  // Demo setup for presentations
  DEMO: {
    ...DEFAULT_CONFIG,
    CLEAR_EXISTING_DATA: true,
    CREATE_TEST_USERS: true,
    ADMIN_COUNT: 2,
    RETAILER_COUNT: 5,
    SHOP_OWNER_COUNT: 10,
    DELIVERY_BOY_COUNT: 3,
    STORE_COUNT: 8,
    PRODUCT_COUNT: 25,
    ORDERS_COUNT: 15,
  } as SeedConfig,
};

/**
 * EXTENSION TEMPLATES FOR FUTURE AGENT PROMPTS
 * 
 * These functions provide templates that can be easily modified
 * to accommodate new feature requirements.
 */

// Template for adding new user roles
export function createCustomUserConfig(role: string, count: number) {
  return {
    [`${role.toUpperCase()}_COUNT`]: count,
  };
}

// Template for adding new test users
export function createTestUser(email: string, password: string, role: string, fullName: string) {
  return {
    email,
    password,
    role: role as 'ADMIN' | 'RETAILER' | 'SHOP_OWNER' | 'DELIVERY_BOY',
    fullName,
  };
}

// Template for feature-specific configurations
export function createFeatureConfig(featureName: string, options: Record<string, any>) {
  return {
    [`${featureName.toUpperCase()}_ENABLED`]: true,
    [`${featureName.toUpperCase()}_CONFIG`]: options,
  };
}