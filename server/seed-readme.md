# Database Seeding Documentation for Future Agent Requirements

## Current Status
✅ **Migration Completed Successfully**

The ShopLink commerce application has been successfully migrated to the Replit environment with:
- PostgreSQL database connected and schema deployed
- Test user accounts created for all roles
- Application running on port 5000
- All dependencies installed and working

## Current Database Schema

### Core Tables
- `users` - All user accounts (Admin, Retailer, Shop Owner, Delivery Boy)
- `stores` - Retailer stores 
- `productCatalog` - Global product catalog managed by admins
- `listings` - Products listed by retailers in their stores
- `orders` - Customer orders placed to retailers
- `orderItems` - Individual items within orders
- `orderEvents` - Order status change history

### Test User Accounts
- **Admin**: admin@test.com / admin123
- **Retailer**: retailer@test.com / retailer123
- **Shop Owner**: shop@test.com / shop123
- **Delivery Boy**: delivery@test.com / delivery123

## For Future Agent Enhancements

### Quick Commands
```bash
# Reseed database with fresh test data
tsx server/seed-database.ts

# Push schema changes to database
npm run db:push

# Force push if there are warnings
npm run db:push --force

# Start the application
npm run dev
```

### Adding New Features

#### 1. Database Schema Changes
1. Edit `shared/schema.ts` to add new tables or modify existing ones
2. Run `npm run db:push` to apply changes
3. Update `server/seed-database.ts` if test data is needed

#### 2. Adding New User Roles
1. Update `roleEnum` in `shared/schema.ts`
2. Add role-specific routes in `server/routes.ts`
3. Create role dashboard in `client/src/pages/[role]/dashboard.tsx`
4. Update authentication logic in `client/src/hooks/use-auth.tsx`

#### 3. Real-time Features
- WebSocket server is already configured in `server/index.ts`
- Client WebSocket connection is in `client/src/lib/socket.ts`
- Toast notifications are set up in `client/src/components/toast-notifications.tsx`

#### 4. Adding New Business Logic
- Add API routes in `server/routes.ts`
- Update storage interface in `server/storage.ts` if needed
- Add frontend components in `client/src/components/`
- Use React Query for data fetching in components

### Common Patterns

#### Creating New API Endpoints
```typescript
// In server/routes.ts
app.get('/api/new-feature', authenticateToken, async (req, res) => {
  // Implementation
});
```

#### Adding New UI Components
```typescript
// Use existing shadcn/ui components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
```

#### Database Queries
```typescript
// Use Drizzle ORM with proper types
import { db } from './db.js';
import * as schema from '../shared/schema.js';

const results = await db.select().from(schema.tableName);
```

### Configuration for Different Scenarios

The application can be easily configured for different use cases:

- **Demo Setup**: Minimal data for presentations
- **Development**: Rich test data for development
- **Testing**: Clean slate with specific test scenarios
- **Production**: Real data migration tools

### Important Notes for Future Agents

1. **Database Safety**: Always use `npm run db:push` for schema changes, never write manual SQL migrations
2. **Authentication**: JWT tokens are used with role-based access control
3. **Real-time**: WebSocket connections are established per user for order notifications
4. **Types**: Shared types in `shared/schema.ts` ensure type safety across frontend and backend
5. **State Management**: Zustand for client state, React Query for server state

### File Structure for Reference
```
├── client/src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Route-based page components
│   ├── hooks/         # Custom React hooks
│   └── lib/           # Utilities and configurations
├── server/
│   ├── index.ts       # Express server with WebSocket
│   ├── routes.ts      # API endpoints
│   ├── storage.ts     # Database operations
│   └── seed-database.ts # Database seeding
└── shared/
    └── schema.ts      # Database schema and types
```

This foundation provides a solid base for extending the application with new features, user roles, or business logic as requirements evolve.