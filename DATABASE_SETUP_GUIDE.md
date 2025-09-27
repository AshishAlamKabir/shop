# Database Setup Guide

## Quick Setup

To set up the database with demo accounts and test data, run:

```bash
npm run setup-db
```

Or directly:

```bash
node setup-database.js
```

## Demo Account Credentials

| Role        | Email                | Password      |
|-------------|---------------------|---------------|
| Admin       | admin@test.com      | admin123      |
| Wholesaler  | wholesaler@test.com | wholesaler123 |
| Shop Owner  | shop@test.com       | shop123       |
| Delivery Boy| delivery@test.com   | delivery123   |

## What the Setup Script Does

1. **Checks Prerequisites**: Verifies all required files and database connection
2. **Deploys Schema**: Creates all database tables using Drizzle migrations
3. **Seeds Data**: Creates demo accounts and sample business data including:
   - 4 demo user accounts (one for each role)
   - Sample products in the global catalog
   - Test stores for wholesalers
   - Product listings with pricing
   - Sample orders and order history
   - Khatabook (ledger) entries
   - Payment audit trails
   - Delivery boy assignments

## Manual Database Reset

If you need to manually reset the database:

1. **Deploy Schema**:
   ```bash
   npm run db:push
   ```

2. **Seed Data**:
   ```bash
   cd server && npx tsx seed-database.ts
   ```

## Using Demo Accounts

1. Visit your application URL
2. On the login page, click any demo account button to auto-fill credentials
3. Or manually enter the email/password from the table above

### Available Dashboards by Role

- **Admin**: User management, product catalog, system analytics
- **Wholesaler**: Store management, inventory, order fulfillment, Khatabook
- **Shop Owner**: Browse products, place orders, view order history, Khatabook
- **Delivery Boy**: View assigned deliveries, update delivery status

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL database is provisioned in your Replit project
- Check that `DATABASE_URL` environment variable is set

### Schema Deployment Fails
- Try force push: `npm run db:push -- --force`
- Check for database connection issues

### Seeding Fails
- Ensure schema is deployed first
- Check database permissions
- Verify all dependencies are installed

### Login Issues
- Confirm database is seeded with demo accounts
- Check server logs for authentication errors
- Verify password mappings in login component

## Production Considerations

⚠️ **Important**: These demo accounts are for development/testing only. In production:

1. Remove or change demo account passwords
2. Implement proper user registration flows  
3. Add email verification
4. Configure proper JWT secrets
5. Set up database backups
6. Implement rate limiting

## File Structure

```
├── setup-database.js          # Main setup script
├── server/
│   ├── seed-database.ts       # Database seeding logic
│   ├── db.ts                  # Database connection
│   └── storage.ts             # Data access layer
├── shared/
│   └── schema.ts              # Database schema definitions
└── drizzle.config.ts          # Drizzle configuration
```