# Overview

ShopLink is a multi-role commerce application that connects three types of users in a B2B marketplace. Admins manage a global product catalog, Retailers create stores and set prices for products from the catalog, and Shop Owners browse stores and place orders. The application features real-time notifications for order events and implements a comprehensive order management system with status tracking.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript in a Vite-based development environment
- **UI Library**: Radix UI components with shadcn/ui design system for consistent styling
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: Zustand for global state (auth, cart) with React Query for server state
- **Routing**: Wouter for client-side routing with role-based access control
- **Real-time Communication**: WebSocket integration for live notifications

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the full stack
- **API Design**: RESTful endpoints with role-based middleware authentication
- **Real-time Features**: WebSocket server using native WebSocket API for order notifications
- **Authentication**: JWT-based authentication with role-based authorization middleware

## Database Design
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Schema**: Role-based user system, product catalog, store management, listings, and order tracking
- **Key Entities**: Users (3 roles), Stores, Product Catalog, Listings, Orders, Order Items, Order Events

## Authentication & Authorization
- **Authentication Method**: JWT tokens with bcrypt/argon2 password hashing
- **Authorization**: Role-based access control with middleware guards
- **Token Storage**: Local storage with Zustand persistence
- **Session Management**: Automatic token refresh and session validation

## Real-time Features
- **WebSocket Implementation**: Native WebSocket server for real-time order notifications
- **Event Types**: Order placed, accepted, rejected, status updates, delivery notifications
- **Client Management**: User-specific WebSocket connections with automatic reconnection
- **Notification System**: Toast notifications with role-specific messaging

## Development Setup
- **Monorepo Structure**: Shared schema and types between client and server
- **Build System**: Vite for frontend bundling, esbuild for backend compilation
- **Development Tools**: TypeScript compilation, hot module replacement, error overlays
- **Code Organization**: Path aliases for clean imports, shared utilities and types

# External Dependencies

## Database & Storage
- **PostgreSQL**: Primary database via Neon serverless platform
- **Drizzle ORM**: Type-safe database operations and migrations
- **Connection Pooling**: @neondatabase/serverless for optimized connections

## UI & Styling
- **Radix UI**: Comprehensive accessible component library
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **shadcn/ui**: Pre-built component system with consistent styling
- **Lucide React**: Icon library for UI elements

## Authentication & Security
- **bcrypt/argon2**: Password hashing libraries for secure authentication
- **jsonwebtoken**: JWT token generation and validation
- **Role-based middleware**: Custom authorization guards

## Development & Build Tools
- **Vite**: Frontend build tool with HMR and optimized bundling
- **esbuild**: Fast TypeScript compilation for backend
- **Replit Integration**: Development environment plugins and error handling
- **TypeScript**: Full-stack type safety with shared type definitions

## Real-time Communication
- **WebSocket**: Native WebSocket implementation for real-time features
- **Custom WebSocket Client**: Connection management and reconnection logic

## State Management
- **React Query**: Server state management with caching and synchronization
- **Zustand**: Client-side state management with persistence
- **React Hook Form**: Form state management with validation