#!/usr/bin/env node

/**
 * Database Setup Script for Commerce Application
 * 
 * This script handles complete database setup including:
 * - Database schema deployment
 * - Demo account creation
 * - Test data seeding
 * 
 * Usage:
 *   node setup-database.js
 *   npm run setup-db (if added to package.json)
 * 
 * Demo Account Credentials Created:
 * - Admin: admin@test.com / admin123
 * - Wholesaler: wholesaler@test.com / wholesaler123  
 * - Shop Owner: shop@test.com / shop123
 * - Delivery Boy: delivery@test.com / delivery123
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

console.log('🚀 Starting Database Setup...\n');

// Function to run command and handle errors
function runCommand(command, description) {
  console.log(`📦 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completed successfully`);
    return output;
  } catch (error) {
    console.error(`❌ ${description} failed:`);
    console.error(error.message);
    if (error.stdout) {
      console.error('STDOUT:', error.stdout);
    }
    if (error.stderr) {
      console.error('STDERR:', error.stderr);
    }
    throw error;
  }
}

// Function to check if DATABASE_URL exists
function checkDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL environment variable not found');
    console.log('📝 Please ensure your database is provisioned in Replit');
    console.log('   Go to your Replit project and provision a PostgreSQL database');
    return false;
  }
  console.log('✅ Database connection string found');
  return true;
}

// Function to wait for user input (for interactive mode)
async function waitForContinue() {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Press Enter to continue or Ctrl+C to abort...', () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  try {
    console.log('🔍 Step 1: Checking Prerequisites...');
    
    // Check if we're in the right directory
    if (!fs.existsSync('package.json')) {
      throw new Error('package.json not found. Please run this script from the project root directory');
    }
    
    if (!fs.existsSync('drizzle.config.ts')) {
      throw new Error('drizzle.config.ts not found. Please ensure Drizzle is properly configured');
    }
    
    if (!fs.existsSync('server/seed-database.ts')) {
      throw new Error('server/seed-database.ts not found. Please ensure the seed script exists');
    }
    
    console.log('✅ All prerequisite files found\n');
    
    console.log('🔍 Step 2: Checking Database Connection...');
    if (!checkDatabaseConnection()) {
      console.log('\n🛑 Cannot proceed without database connection');
      console.log('Please provision a PostgreSQL database first and try again');
      process.exit(1);
    }
    console.log('');
    
    console.log('📊 Step 3: Deploying Database Schema...');
    runCommand('npm run db:push', 'Database schema deployment');
    console.log('');
    
    console.log('🌱 Step 4: Seeding Database with Demo Accounts and Test Data...');
    runCommand('cd server && npx tsx seed-database.ts', 'Database seeding');
    console.log('');
    
    console.log('🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!\n');
    
    console.log('📋 Demo Account Credentials:');
    console.log('┌─────────────┬──────────────────────┬──────────────────┐');
    console.log('│ Role        │ Email                │ Password         │');
    console.log('├─────────────┼──────────────────────┼──────────────────┤');
    console.log('│ Admin       │ admin@test.com       │ admin123         │');
    console.log('│ Wholesaler  │ wholesaler@test.com  │ wholesaler123    │');
    console.log('│ Shop Owner  │ shop@test.com        │ shop123          │');
    console.log('│ Delivery Boy│ delivery@test.com    │ delivery123      │');
    console.log('└─────────────┴──────────────────────┴──────────────────┘\n');
    
    console.log('🚀 Your application is ready to use!');
    console.log('   Visit your Replit app URL and use the demo accounts above');
    console.log('   Click the demo account buttons on the login page for quick access\n');
    
    console.log('💾 Database Summary:');
    console.log('   • Database schema deployed with all tables');
    console.log('   • 4 demo accounts created (admin, wholesaler, shop owner, delivery boy)');
    console.log('   • Sample products, stores, and orders generated');
    console.log('   • Khatabook entries and payment audit trails created');
    console.log('   • Notification system ready\n');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\n🔧 Troubleshooting Tips:');
    console.error('   1. Ensure your Replit project has a PostgreSQL database provisioned');
    console.error('   2. Check that DATABASE_URL environment variable is set');
    console.error('   3. Verify all dependencies are installed (npm install)');
    console.error('   4. Make sure you are running this from the project root directory');
    console.error('\n📞 If issues persist, check the Replit console for detailed error messages');
    process.exit(1);
  }
}

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, runCommand, checkDatabaseConnection };